# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guarantees

1. [ ] Capture anything from anywhere, quickly.
2. [ ] Nothing captured is ever lost.
3. [ ] Any earlier version is recoverable.

No tests exist, so verify these by hand frequently. Weakening one is a bug.

## Tech stack

- Electron 39 desktop app, built by electron-vite 5 (Vite 7), packaged by electron-builder 26.
- React 19 + TypeScript in the renderer. Tailwind v4 through `@tailwindcss/vite` — v4 style, there is no `tailwind.config.js`.
- CodeMirror 6 as the editor, with `@codemirror/lang-markdown` and `@replit/codemirror-vim`. CodeMirror deps are pinned exactly, unlike the rest.
- pnpm, with `shamefully-hoist=true`.
- ESLint flat config + Prettier via `@electron-toolkit` configs. Prettier owns formatting; match the surrounding code and let it normalize.

## Layout

```
docs/roadmap.md         todo / in progress / done / backlog
src/main/index.ts       app lifecycle, window, tray, global shortcut, IPC handlers, save debounce
src/main/notes.ts       disk layer: tab id generation, listing, atomic write
src/preload/index.ts    contextBridge exposing window.api
src/preload/index.d.ts  Window typing for window.api
src/renderer/src/       App.tsx (tab bar + tab state), Editor.tsx (CodeMirror host), main.tsx, assets/main.css
src/shared/             types crossing all three processes
.data/                  one <tabId>.md per tab, gitignored
out/                    build output; package main is out/main/index.js
```

Conventions no config encodes: explicit return types on exported functions including `: void`; `readonly` on interface fields and props; comments explain why, not what.

## Commands

- `pnpm dev` — run the app.
- `pnpm start` — `electron-vite preview`. Runs the built `out/`, **not** a dev server.
- `pnpm typecheck` — always via the script. It splits node/web and passes `--composite false`; both tsconfigs set `composite: true`, so a plain `tsc --noEmit -p tsconfig.node.json` fails.
- `pnpm lint` — `eslint --cache`. A stale `.eslintcache` can mask results.
- `pnpm build` — typechecks first.

Gate before committing — run it as one chained command, so lint is skipped when typecheck fails:

```
pnpm typecheck && pnpm lint
```

No test script, no test framework. Nothing here has ever been tested — verification is by hand.

## Errors are fatal by design

`uncaughtException` and `unhandledRejection` both show a dialog and `app.exit(1)`. Never add a `catch` that logs and continues.

## Git

Trunk-based: commit directly to `main` with Conventional Commit prefixes (`feat`, `fix`, `docs`, `chore`, `refactor`). No feature branches, no PRs.

## Answering

Never present options without a recommendation. End every list of choices with one pick and a sentence of reasoning.
