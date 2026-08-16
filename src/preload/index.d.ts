import { ElectronAPI } from '@electron-toolkit/preload'

interface NoteApi {
  readNote: () => Promise<string>
  noteChanged: (content: string) => void
  onFocusRequest: (handler: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: NoteApi
  }
}
