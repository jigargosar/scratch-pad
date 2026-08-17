import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
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

async function start(): Promise<void> {
  await app.whenReady()

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

// Anything thrown here reaches the unhandledRejection handler above.
start()

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
