import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Every subscribe returns its own unsubscribe. React effects run twice under
// StrictMode and again on every HMR reload, so listeners accumulate without one.
const api = {
  readNote: (): Promise<string> => ipcRenderer.invoke('note:read'),
  writeNote: (content: string): Promise<void> => ipcRenderer.invoke('note:write', content),
  onFlushRequest: (handler: () => void): (() => void) => {
    const listener = (): void => handler()
    ipcRenderer.on('note:flush', listener)
    return () => ipcRenderer.removeListener('note:flush', listener)
  },
  onFocusRequest: (handler: () => void): (() => void) => {
    const listener = (): void => handler()
    ipcRenderer.on('editor:focus', listener)
    return () => ipcRenderer.removeListener('editor:focus', listener)
  },
  reportFlushed: (ok: boolean, message?: string): void => {
    ipcRenderer.send('note:flushed', ok, message)
  }
}

if (process.contextIsolated) {
  // No try/catch: if the bridge cannot be installed the renderer has no way to
  // read or save notes, and hiding that behind a logged error would leave a
  // window that looks fine and silently loses everything typed into it.
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
