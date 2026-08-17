import { ElectronAPI } from '@electron-toolkit/preload'
import type { Tab } from '../shared/tab'

interface TabApi {
  readonly listTabs: () => Promise<readonly Tab[]>
  readonly createTab: () => Promise<Tab>
  readonly tabChanged: (id: string, content: string) => void
  readonly onFocusRequest: (handler: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TabApi
  }
}
