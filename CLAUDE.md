# scratch-pad

Ambitious Project for quick and permenant capture anything from anywhere. No loss data gurantee. 


This is the next iteration: the earlier prototype was stripped back to scaffolding and is being rebuilt from scratch.

## Protype scope
- [x] multi tab interface.
- [x] add new tab
- [x] global hot key activation.
- [x] all changes preserved
- [x] vim bindings.

## Also shipped

- One file per tab under `.data/`, named by tab id.
- Saves are debounced 500ms in main, written temp file then rename.
- Tray icon with Show and Quit. Close hides, only the tray quits.
- Tab labels come from the first non blank line.
- Each tab keeps its own editor state, so switching keeps cursor and undo.

## Tech stack

- Electron desktop app, packaged with electron-builder.
- electron-vite (Vite) for dev and build.
- React + TypeScript in the renderer.
- CodeMirror as the editor, with `@codemirror/lang-markdown` and `@replit/codemirror-vim` for vim bindings.
- pnpm for package management.
- ESLint + Prettier via `@electron-toolkit` configs.
- Typecheck is split: `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer); `pnpm typecheck` runs both.
