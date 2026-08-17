// Shared by main, preload and renderer. Type only, so nothing is emitted and
// no runtime code crosses the process boundary.
export interface Tab {
  readonly id: string
  readonly content: string
}
