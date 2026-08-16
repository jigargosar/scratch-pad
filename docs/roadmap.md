# Roadmap

## Current state

Prototype. Global hotkey, tray, one markdown note, vim, autosave. Blocks and tabs not built.

## Next steps

1. Add Tailwind: renderer styling currently lives in hand-written CSS in `src/renderer/src/assets/main.css`.

2. Set up a proper testing framework and environment: no test runner is installed and no test has ever run. Vitest for unit work, Playwright `_electron` for driving the real app.

3. Verify the app runs: the simplification rewrite is committed but was never launched. Main now owns the debounce and writes synchronously; the flush handshake and the write queue were deleted. None of that has been executed once.

4. Extract storage and test it: move the file I/O out of `src/main/index.ts` into `src/main/noteStore.ts`, taking a path argument so it runs without Electron. Cover with vitest — a missing file returns empty, any other read error throws, the atomic rename leaves no `.tmp` behind, and flushing writes the last content.

## Non-obvious facts

1. CodeMirror 6, not Monaco. Monaco is one language per model, so multi-block files are impossible in it.
2. `vim()` goes first in the extensions array, or basicSetup's keymap shadows it.
3. Notes live in `.data/` in dev, userData in prod.
4. Hotkey `Ctrl+Alt+Space`. Failing to register throws and kills startup, deliberately.
5. Close button hides. Only the tray quits. Quitting unregisters the shortcut.
6. Hide calls `minimize()` then `hide()` — Windows will not return focus to the previous app otherwise.
7. Main owns the debounce and writes synchronously. Renderer only reports changes.
8. Read returns empty on ENOENT and throws on anything else. The renderer then builds no editor, so autosave cannot overwrite an unreadable note.
9. Never run the scaffolder at the project root — its "remove existing files" deletes `.git`.
10. Repo is public: `github.com/jigargosar/scratch-pad`.

## Features

Global shortcut toggle.
Desktop.
Tab editor.
Support. Vim.
Title derived from first non blank line.
Fast prototype.
Files in tab always Save.
File backup rotation.

## Later

Heynote like sections.
each section partially acts like a file
code/markdown parser support
search
