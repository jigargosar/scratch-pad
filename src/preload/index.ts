import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Tab } from '../shared/tab'

const api = {
  listTabs: (): Promise<readonly Tab[]> => ipcRenderer.invoke('tabs:list'),
  createTab: (): Promise<Tab> => ipcRenderer.invoke('tabs:create'),
  tabChanged: (id: string, content: string): void => ipcRenderer.send('tab:changed', id, content),
  // Returns its own unsubscribe. React effects run twice under StrictMode and
  // again on every HMR reload, so listeners accumulate without one.
  onFocusRequest: (handler: () => void): (() => void) => {
    const listener = (): void => handler()
    ipcRenderer.on('editor:focus', listener)
    return () => ipcRenderer.removeListener('editor:focus', listener)
  }
}

// The bridge is the only route from the renderer to disk. Without context
// isolation there is no bridge, so fail loudly here rather than hand back a
// window that looks fine and saves nothing.
if (!process.contextIsolated) {
  throw new Error('contextIsolation is off: the renderer would have no way to reach main.')
}

// No try/catch: a failure to expose is the same loss of everything.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
