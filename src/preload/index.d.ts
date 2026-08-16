import { ElectronAPI } from '@electron-toolkit/preload'

interface NoteApi {
  readNote: () => Promise<string>
  writeNote: (content: string) => Promise<void>
  onFlushRequest: (handler: () => void) => () => void
  onFocusRequest: (handler: () => void) => () => void
  reportFlushed: (ok: boolean, message?: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: NoteApi
  }
}
