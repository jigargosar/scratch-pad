# Roadmap

## Todo

- Verify the prototype by hand: type, switch tabs, add a tab, use vim keys, toggle with the hotkey.

## In progress

- Nothing.

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

## Backlog

- Close and reorder tabs.
- Durable writes: rename is atomic, but without fsync a power cut can still lose the last write.
- Versioned history.
- Test runner. None is installed and no test has ever run.
