import { app, shell, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog } from 'electron'
import { join, dirname } from 'path'
import { mkdir, readFile, writeFile, rename } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const TOGGLE_ACCELERATOR = 'Control+Alt+Space'
const FLUSH_TIMEOUT_MS = 3000

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

// Electron ignores unhandled rejections by default, so a `throw` inside an
// async handler would vanish. These make every escaped error visible and fatal.
function fatal(context: string, error: unknown): never {
  dialog.showErrorBox(`Scratch Pad: ${context}`, describe(error))
  app.exit(1)
  throw error
}

process.on('uncaughtException', (error) => fatal('uncaught exception', error))
process.on('unhandledRejection', (reason) => fatal('unhandled rejection', reason))

// Prototype keeps its data inside the project, not in the user profile.
// Production would use app.getPath('userData').
function notePath(): string {
  const root = is.dev ? process.cwd() : app.getPath('userData')
  return join(root, '.data', 'scratch.md')
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

// A missing file is a defined state, not a failure. Every other error is real
// and must reach the renderer, which then refuses to autosave over a note it
// could not read.
async function readNote(): Promise<string> {
  try {
    return await readFile(notePath(), 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return ''
    throw error
  }
}

// Write to a sibling temp file and rename over the target. Rename is atomic on
// the same volume, so a crash mid-write cannot leave a truncated note.
async function writeNoteAtomic(content: string): Promise<void> {
  const file = notePath()
  const temp = `${file}.tmp`
  await mkdir(dirname(file), { recursive: true })
  await writeFile(temp, content, 'utf8')
  await rename(temp, file)
}

// Serialize writes. Two overlapping saves could otherwise rename out of order
// and leave the older content on disk.
let writeTail: Promise<unknown> = Promise.resolve()

function enqueueWrite(content: string): Promise<void> {
  const run = writeTail.then(
    () => writeNoteAtomic(content),
    () => writeNoteAtomic(content)
  )
  // `run` carries any failure to the caller, and through ipcMain.handle to the
  // renderer. This catch only keeps a past failure from rejecting the next
  // write's chain; it is not where the error goes to die.
  writeTail = run.catch(() => undefined)
  return run
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

  mainWindow.on('ready-to-show', () => {
    showWindow()
  })

  // The close button hides the app rather than killing it. Quitting would
  // unregister the global shortcut, leaving no way back in.
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    hideWindow().catch((error) => fatal('hide on close', error))
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).catch((error) => fatal('open external link', error))
    return { action: 'deny' }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    fatal('renderer process gone', new Error(details.reason))
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow
      .loadURL(process.env['ELECTRON_RENDERER_URL'])
      .catch((error) => fatal('load renderer URL', error))
  } else {
    mainWindow
      .loadFile(join(__dirname, '../renderer/index.html'))
      .catch((error) => fatal('load renderer file', error))
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
  // Focusing the OS window does not focus CodeMirror, which is only focused
  // once at creation. Without this, keystrokes after a re-summon go nowhere.
  win.webContents.send('editor:focus')
}

// Ask the renderer to save, wait for its verdict, then hide.
function requestFlush(win: BrowserWindow): Promise<{ ok: boolean; message?: string }> {
  return new Promise((resolve) => {
    let settled = false

    const finish = (result: { ok: boolean; message?: string }): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ipcMain.removeListener('note:flushed', onFlushed)
      resolve(result)
    }

    const onFlushed = (_event: unknown, ok: boolean, message?: string): void => {
      finish({ ok, message })
    }

    const timer = setTimeout(() => {
      finish({ ok: false, message: `Renderer did not respond within ${FLUSH_TIMEOUT_MS}ms` })
    }, FLUSH_TIMEOUT_MS)

    ipcMain.on('note:flushed', onFlushed)
    win.webContents.send('note:flush')
  })
}

// Windows does not hand focus back to the previously active app on hide alone.
// Minimizing first makes the window manager pick the next window in the stack.
async function hideWindow(): Promise<void> {
  const win = liveWindow()
  if (!win) return

  const result = await requestFlush(win)
  if (!result.ok) {
    // Never hide unsaved work silently.
    dialog.showErrorBox(
      'Scratch Pad could not save',
      `${result.message ?? 'Unknown error'}\n\nThe window stays open so nothing is lost.`
    )
    showWindow()
    return
  }

  win.minimize()
  win.hide()
}

function toggleWindow(): void {
  const win = liveWindow()
  if (!win) return
  if (win.isVisible() && win.isFocused()) {
    hideWindow().catch((error) => fatal('hide window', error))
  } else {
    showWindow()
  }
}

function createTray(): void {
  tray = new Tray(icon)
  tray.setToolTip('Scratch Pad')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: () => showWindow() },
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
  tray.on('click', () => toggleWindow())
}

app
  .whenReady()
  .then(() => {
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.handle('note:read', () => readNote())
    ipcMain.handle('note:write', (_event, content: string) => enqueueWrite(content))

    createWindow()
    createTray()

    // A scratchpad you cannot summon is not this app. Refusing to start beats
    // running in a state where the core interaction silently does nothing.
    if (!globalShortcut.register(TOGGLE_ACCELERATOR, toggleWindow)) {
      throw new Error(
        `Global shortcut ${TOGGLE_ACCELERATOR} is already registered by another application.`
      )
    }
    console.log(`Global shortcut registered: ${TOGGLE_ACCELERATOR}`)

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error) => fatal('startup', error))

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  tray?.destroy()
  tray = null
})

// No quit on window-all-closed: the tray keeps the app alive so the global
// shortcut stays registered.
