# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Plattenzuschnitt is a client-only PWA that computes guillotine cut plans for wood panels (stock sheets → cut pieces) and, in a second mode, 1D cut plans for bars/battens. No backend; state lives in `localStorage`. All UI text is German.

See also `AGENTS.md` (conventions: functional components, camelCase/PascalCase, imperative commit messages). Versions: React 19, Tailwind 4, Vite 8, TypeScript 6.

## Commands

- `npm ci` — install
- `npm run dev` — dev server (port 5173, served under `/plattenzuschnitt/`)
- `npm run build` — `tsc` typecheck + Vite build (this is the only type/lint gate; there is no ESLint/Prettier)
- `npm test` — Vitest, runs once (`vitest run`); `npm run test:watch` for watch mode
- Single test: `npx vitest run src/algorithm/guillotine.test.ts -t "generateCutSequence"`

Tests run in the `node` environment (no DOM), so only pure logic (`src/algorithm/`, `src/utils/`) is unit-tested.

## Deployment

`.github/workflows/ci.yml` runs `npm ci`, tests and build on every pull request. `.github/workflows/deploy.yml` runs the same on push to `main` and deploys `dist/` to GitHub Pages. `npm ci` fails if `package.json` and `package-lock.json` are out of sync, so regenerate the lockfile with npm (never hand-edit or hand-merge it). `vite.config.ts` sets `base: '/plattenzuschnitt/'` — required for Pages; don't remove it. `vite-plugin-pwa` generates the service worker/manifest.

## Architecture

**Data flow:** `store.ts` (Zustand) holds inputs → user clicks "Berechnen" in `Header` → `App.handleCompute` builds a `ComputeRequest` from `useStore.getState()` and sends it to a Web Worker (`useComputeWorker` → `workers/compute.worker.ts` → `runCompute` in `algorithm/computeRequest.ts`, which calls `computeCutPlan` / `computeLinearPlan`) → the resulting plan is kept in `App`'s local `useState` (not in the store, not persisted) and passed as props to the diagram and results panels. Plans are only recomputed on explicit click, never reactively. Only one computation runs at a time; "Abbrechen" (or a new computation / project change) terminates the worker, which is the only way to interrupt the algorithm. Everything crossing the worker boundary must be structured-cloneable (plain data, no functions).

- When `grainEnabled` is false, `runCompute` rewrites every piece to `grain: 'any'` before computing — the algorithm itself only looks at `piece.grain`.
- `MAX_TOTAL_PIECES` (500, in `constants.ts`) caps the expanded piece count; compute is disabled above it.

**Persistence:** `store.ts` subscribes (with `shallow` equality) and writes `selectPersisted(state)` to `localStorage` key `plattenzuschnitt_v1` via `persistence.ts`. `parsePersistedState()` validates and back-fills missing fields (e.g. `thickness` defaults to 18, invalid `grain` → `'any'`, `price` → 0). When adding a persisted field, update: `AppState` + initial value, `selectPersisted`, `loadProjectData`, and `PersistedState` + `parsePersistedState()`.

**Projects (`projects.ts`, `ProjectMenu`):** named snapshots of the persisted state, keyed by name, stored under `plattenzuschnitt_projects_v1`; also exported/imported as JSON files (`{ app: 'plattenzuschnitt', version, name, data }`). Everything loaded goes through `parsePersistedState()`, then `loadProjectData()` replaces all inputs and `App` clears the current plans.

**Algorithm (`src/algorithm/guillotine.ts`):**
- `computeCutPlan` expands pieces by `quantity` into distinct objects (placement tracking is by object reference), then repeatedly opens the smallest available stock plate that fits the largest remaining piece and fills it with `placeOnPanel`.
- `placeOnPanel` is a recursive greedy guillotine packer: place one piece at the panel origin, split the remainder into two sub-panels (kerf subtracted), recurse. Both split orders are compared only down to `SPLIT_COMPARE_DEPTH`; deeper levels use a heuristic to avoid exponential blow-up. `scoreResult` weights area vs. cut count according to `priority` (`least-waste` / `least-cuts` / `balanced`).
- A piece fits a stock plate only if `thickness` matches exactly. Rotation is allowed only for `grain === 'any'`.
- Each `PlacedPlate` carries a `cutTree` (`CutNode`); `generateCutSequence` flattens it into human-readable German `CutStep`s used by `CutList`.

**1D mode (`mode: '1d'`):** `ModeToggle` switches the input panel between `InputPanel` and `LinearInputPanel`; both modes' inputs are kept in the store and persisted. `computeLinearPlan` (`src/algorithm/linear.ts`) is Best-Fit-Decreasing: parts go into the open bar with the least space left, otherwise the shortest available bar of the same `profile` (exact, trimmed string match, analogous to `thickness`). Kerf is only added between parts; `linearTrim` is cut off at the bar start (trim + kerf). `LinearPlan` lives in its own `App` state and is rendered by `LinearDiagram` (HTML bars, not SVG) and `LinearResults`.

**Print / PDF:** `PrintSheet` / `LinearPrintSheet` are rendered next to the app with `hidden print:block`, while the app layout is `print:hidden`; "Drucken / PDF" just calls `window.print()`. Because the same `CutDiagram` renders twice, its SVG pattern ids come from `useId()`.

**Algorithm space vs. display space:** The algorithm works in raw stock `width × height`. `CutDiagram` transposes plates where `height > width` so the long edge is always drawn horizontally. Trim options (`trimLeft`/`trimTop`) are specified in *display* space; `computeCutPlan` maps them into algorithm space using the same `transposed` rule. Any code touching coordinates, trims, or highlights must respect this mapping. Pieces are identified across the diagram and cut list by their algorithm-space `(x, y)` plus plate number (`PieceHighlight` in `App.tsx`), enabling the bidirectional hover highlight.

**Dimension naming:** In the UI, `L` (Länge) maps to `height` and `B` (Breite) maps to `width`. CSV import (`utils/csvImport.ts`) accepts German and English headers and grain values (`längs`→`horizontal`, `quer`→`vertical`), with `;`, `,` or tab auto-detected; without a recognized header row it assumes the table's column order. 1D tables use `parseLinearCsv` (there `L` means length). `InlineTable` routes multi-cell clipboard pastes (Excel rows) through the same import dialog.

**UI layout:** `App` switches on `useMediaQuery('(min-width: 1024px)')` between a 3-column desktop grid (input | diagram | results) and a mobile tab layout (`MobileTabBar`). `StockTable` and `PiecesTable` are thin wrappers around the generic `InlineTable` (inline editing, sorting, CSV import/export). `PiecesTable` still has a `useInlineTableForPieces` store flag (default `true`, not persisted) with a legacy read-only fallback table.
