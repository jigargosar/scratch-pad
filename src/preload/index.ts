import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  readNote: (): Promise<string> => ipcRenderer.invoke('note:read'),
  noteChanged: (content: string): void => ipcRenderer.send('note:changed', content),
  // Returns its own unsubscribe. React effects run twice under StrictMode and
  // again on every HMR reload, so listeners accumulate without one.
  onFocusRequest: (handler: () => void): (() => void) => {
    const listener = (): void => handler()
    ipcRenderer.on('editor:focus', listener)
    return () => ipcRenderer.removeListener('editor:focus', listener)
  }
}

if (process.contextIsolated) {
  // No try/catch: without the bridge the renderer cannot read or save notes,
  // and logging that would leave a window that looks fine but loses everything.
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
