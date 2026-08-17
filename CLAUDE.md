# scratch-pad

Ambitious Project for quick and permenant capture anything from anywhere. No loss data gurantee. 


This is the next iteration: the earlier prototype was stripped back to scaffolding and is being rebuilt from scratch.

## Protype scope
- multi tab interface.
- add new tab
- global hot key activation.
- all changes preserved
- vim bindings.

## Tech stack

- Electron desktop app, packaged with electron-builder.
- electron-vite (Vite) for dev and build.
- React + TypeScript in the renderer.
- CodeMirror as the editor, with `@codemirror/lang-markdown` and `@replit/codemirror-vim` for vim bindings.
- pnpm for package management.
- ESLint + Prettier via `@electron-toolkit` configs.
- Typecheck is split: `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer); `pnpm typecheck` runs both.
