import { app, shell, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { listTabs, newTabId, writeTab, type Tab } from './notes'

const TOGGLE_ACCELERATOR = 'Control+Alt+Space'
const SAVE_DEBOUNCE_MS = 500

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

// Electron ignores unhandled rejections, so a throw inside an async handler
// would vanish. These make every escaped error visible and fatal.
function fatal(context: string, error: unknown): never {
  dialog.showErrorBox(`Scratch Pad: ${context}`, describe(error))
  app.exit(1)
  throw error
}

function onFailure(context: string): (error: unknown) => never {
  return (error) => fatal(context, error)
}

process.on('uncaughtException', onFailure('uncaught exception'))
process.on('unhandledRejection', onFailure('unhandled rejection'))

// Prototype keeps its data inside the project, not in the user profile.
// Production would use app.getPath('userData').
function notesDir(): string {
  const root = is.dev ? process.cwd() : app.getPath('userData')
  return join(root, '.data')
}

// Main owns the debounce, so hiding just flushes a local timer. No round trip
// to the renderer, nothing to time out, nothing to get out of order. Pending
// content is keyed by tab, so edits in one tab never delay another's save.
const pending = new Map<string, string>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave(id: string, content: string): void {
  pending.set(id, content)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS)
}

function saveNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const dir = notesDir()
  for (const [id, content] of pending) writeTab(dir, id, content)
  pending.clear()
}

function createTab(): Tab {
  const tab: Tab = { id: newTabId(), content: '' }
  // Write immediately: the file is what makes the tab exist, so a crash before
  // the first keystroke still leaves the tab there on restart.
  writeTab(notesDir(), tab.id, tab.content)
  return tab
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', showWindow)

  // The close button hides the app. Quitting would unregister the global
  // shortcut, leaving no way back in.
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    hideWindow()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch(onFailure('open external link'))
    return { action: 'deny' }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    fatal('renderer process gone', new Error(details.reason))
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch(onFailure('load renderer'))
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch(onFailure('load renderer'))
  }
}

function liveWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

function showWindow(): void {
  const win = liveWindow()
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  // Focusing the OS window does not focus CodeMirror, which is focused only
  // when the editor is built. Without this, keystrokes after a re-summon go
  // nowhere.
  win.webContents.send('editor:focus')
}

// Windows does not hand focus back to the previous app on hide alone.
// Minimizing first makes the window manager pick the next window in the stack.
function hideWindow(): void {
  const win = liveWindow()
  if (!win) return
  saveNow()
  win.minimize()
  win.hide()
}

function toggleWindow(): void {
  const win = liveWindow()
  if (!win) return
  if (win.isVisible() && win.isFocused()) hideWindow()
  else showWindow()
}

function createTray(): void {
  tray = new Tray(icon)
  tray.setToolTip('Scratch Pad')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('click', toggleWindow)
}

async function start(): Promise<void> {
  await app.whenReady()

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // The floor of one tab lives here, not in the renderer: this handler is
  // synchronous, so two calls racing (StrictMode mounts effects twice) cannot
  // both find the store empty and both create a tab.
  ipcMain.handle('tabs:list', () => {
    const tabs = listTabs(notesDir())
    return tabs.length > 0 ? tabs : [createTab()]
  })
  ipcMain.handle('tabs:create', () => createTab())
  ipcMain.on('tab:changed', (_event, id: string, content: string) => scheduleSave(id, content))

  createWindow()
  createTray()

  // A scratchpad you cannot summon is not this app. Refusing to start beats
  // running with the core interaction silently dead.
  if (!globalShortcut.register(TOGGLE_ACCELERATOR, toggleWindow)) {
    throw new Error(`Global shortcut ${TOGGLE_ACCELERATOR} is already taken by another app.`)
  }
  console.log(`Global shortcut registered: ${TOGGLE_ACCELERATOR}`)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

// Anything thrown here reaches the unhandledRejection handler above.
start()

app.on('before-quit', () => {
  isQuitting = true
  saveNow()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  tray?.destroy()
  tray = null
})

// No quit on window-all-closed: the tray keeps the app alive so the global
// shortcut stays registered.
