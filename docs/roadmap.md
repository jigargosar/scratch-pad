# Roadmap

New items are appended to the end of their section.

## Bugs

- Durable writes: rename is atomic, but without fsync a power cut can still lose the last write.
- Save debounce timer is global, not per tab, so typing in one tab defers another tab's pending write. The comment above `scheduleSave` claims the opposite. Fix the code or the comment.
- No single instance lock. A second instance fights over `.data/` and then dies registering the hotkey.
- `setAppUserModelId('com.electron')` does not match electron-builder's `appId` of `com.electron.app`, so tray and notification identity is wrong.
- Pending saves flush only on hide and on quit. Any new hide, minimize, or exit path that skips the flush loses unsaved text.
- The renderer's `onChange` must stay `useCallback`-stable; an unstable reference tears the editor down mid typing and loses what was being written.

## Features

- Close and reorder tabs.
- Versioned history.

## Chores

- Verify the prototype by hand: type, switch tabs, add a tab, use vim keys, toggle with the hotkey.
- Test runner. None is installed and no test has ever run.
- Packaging metadata is still electron-vite scaffolding: `appId`, `productName` (`scratch-pad-new`), `author`, `homepage`, and the placeholder auto-update URL. The README title disagrees with the package name.
- No `.gitattributes`, so `.editorconfig`'s `end_of_line = lf` is unenforced.
- The `@renderer` alias is configured in both `electron.vite.config.ts` and `tsconfig.web.json` but no import uses it.

## Done

- Multi tab interface.
- Add new tab.
- Global hotkey `Ctrl+Alt+Space`, toggles show and hide.
- All changes preserved.
- Vim bindings.
- One file per tab under `.data/`, named by tab id.
- Saves debounced 500ms in main, written temp file then rename.
- Tray icon with Show and Quit. Close hides, only the tray quits.
- Tab labels from the first non blank line.
- Each tab keeps its own editor state, so switching keeps cursor and undo.
