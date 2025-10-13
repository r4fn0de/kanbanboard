# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview

- Desktop app built with React + TypeScript (Vite) packaged via Tauri v2 (Rust). Frontend lives under src/, Tauri under src-tauri/.
- Path alias: import from '@/...' resolves to src/... (see tsconfig.json and vite.config.ts).

Core commands

- Install deps
  - npm install
- Frontend (Vite)
  - Dev server: npm run dev
  - Build: npm run build
  - Preview: npm run preview
  - Typecheck: npm run typecheck
- Lint/format (JS/TS)
  - Lint: npm run lint
  - Lint (fix): npm run lint:fix
  - Format check: npm run format:check
  - Format write: npm run format
- Tests (JS/TS via Vitest)
  - Watch mode: npm run test
  - Run once (CI): npm run test:run
  - Coverage: npm run test:coverage
  - UI runner: npm run test:ui
  - Run a single test file: npm run test:run -- src/feature/MyComponent.test.tsx
  - Run tests matching a name: npm run test:run -- -t "matches name"
- Tauri (desktop)
  - Dev (desktop app): npm run tauri:dev
  - Build installers: npm run tauri:build
  - Tauri check (no bundle): npm run tauri:check
- Rust (src-tauri)
  - Format: npm run rust:fmt
  - Format check: npm run rust:fmt:check
  - Clippy lint: npm run rust:clippy
  - Clippy (apply fixes): npm run rust:clippy:fix
  - Tests: npm run rust:test
  - Run a single Rust test: npm run rust:test -- my_test_name
- All checks locally (recommended before PR): npm run check:all
- Optional: bundle size sanity build: npm run build:analyze

Architecture and structure

- React + Vite (TypeScript)
  - Vite dev server is configured on port 1420 with strictPort and HMR (see vite.config.ts). Alias '@' -> src.
  - Vitest uses jsdom, loads setup from src/test/setup.ts, and includes tests under src/\*_/_.{test,spec}.{ts,tsx,...} (see vitest.config.ts).
- Command system (src/lib/commands)
  - Central registry and a minimal CommandContext unify palette, keyboard shortcuts, and menus.
  - Follows the getState() performance pattern: access Zustand state via useStore.getState() inside command handlers to avoid render cascades.
  - See src/lib/commands/README.md for examples of defining and registering commands.
- State management “onion”
  - Local component state (useState) → global UI state (Zustand) → persistent/server state (TanStack Query). Choose the minimal layer needed.
- React ↔ Tauri (Rust) bridge
  - Event-driven pattern: invoke("command_name", args) from React to Rust; app.emit("event-name", data) in Rust with listen("event-name", handler) on the frontend.
- Tauri (Rust) crate (src-tauri)
  - Tauri v2 with plugins (clipboard, dialog, fs, log, notification, process, opener; updater on desktop builds). Release profile is optimized for size.

CI/CD and releases

- GitHub Actions: .github/workflows/release.yml builds and drafts a release on tags matching v\* (or via manual dispatch). The action uses tauri-apps/tauri-action to produce macOS artifacts and updater metadata.

Docs and guides to consult

- README.md (root): Quick start, architecture highlights (command system, state onion), quality gates and production checklist.
- docs/README.md: Index for developer and user docs.
- src/lib/commands/README.md: How to define/register commands and performance notes.

Rules from CLAUDE/Cursor (mirrored here for Warp)

- Read before editing: open and understand files before applying changes.
- Follow established patterns in docs/developer and the command/state patterns above.
- Performance: prefer getState() access inside commands to avoid unnecessary renders.
- Quality gate: run npm run check:all before proposing significant changes.
- Tauri v2 only: consult Tauri v2 documentation when needed.
- Documentation-first for frameworks: prefer Context7/library docs where applicable over generic web search.
- Cursor rules import CLAUDE.md via .cursor/rules/main.mdc; treat CLAUDE.md as the source of truth for agent behavior in this repo.

Environment notes

- Desktop dev/build requires a working Rust toolchain (rustup). Ensure your shell session has Rust environment initialized before running Tauri commands.
