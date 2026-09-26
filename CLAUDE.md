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
- `placeOnPanel` is a recursive greedy guillotine packer: place the first piece (in sort order) that fits at the panel origin, split the remainder into two sub-panels (kerf subtracted), recurse. Both orientations are tried; both split orders are compared only down to `SPLIT_COMPARE_DEPTH`, deeper levels pick one split heuristically. `scoreResult` weights area vs. cut count according to `priority` (`least-waste` / `least-cuts` / `balanced`).
- The search (`search` / `searchUncached`) works on list positions and relative coordinates and only builds `Placement`/`CutNode` objects at the end (`materialize`). Results are memoized by panel size, depth class and the run-length encoded sequence of piece types (width/height/rotatable), so identical sub-problems are solved once; this cut ~500-piece plans from up to 60 s to about 1 s. Pieces are sorted once per plate (stable sort, same order as before). Any change to the decision logic must keep the memo key complete: everything a sub-search depends on has to be in the key.
- A piece fits a stock plate only if `thickness` matches exactly and `material` matches (`materialMatches` in `utils/items.ts`: case-insensitive, empty matches anything), checked against the plate's usable area after trim (`usableArea`).
- Grain (`orientationFor`): `'horizontal'` = längs (along L = height), `'vertical'` = quer. If piece or plate has no grain, both orientations are allowed; same grain → placed as entered; different grain → rotated 90°. `CutDiagram` shows the grain as ↔/↕ after the piece label, `DiagramPanel` shows the plate grain in the plate header.
- Pieces that find no plate (stock used up or no fitting type) are reported in `unplacedPieces`. `runCompute` then adds `plan.shortage` (`algorithm/shortage.ts`): it re-plans with unlimited stock to get how many plates/bars of each type are needed (`missing`) and which items fit no stock type at all (`unfittable`); `ShortageNotice` shows it in the results panel and print sheet (2D and 1D), including the cost of the missing stock (price × missing). Stock value (Σ quantity × price, `stockValue`) is shown below the stock tables (`StockValueNote`) and in the summaries next to the material cost (price of every plate/bar used).
- Every item has an optional `pos` (position number from the parts list); `itemLabel()` renders "pos name" wherever pieces/parts are shown (diagram, cut sequence, lists, print).
- Each `PlacedPlate` carries a `cutTree` (`CutNode`); `generateCutSequence` flattens it into human-readable German `CutStep`s used by `CutList`.

**1D mode (`mode: '1d'`):** `ModeToggle` switches the input panel between `InputPanel` and `LinearInputPanel`; both modes' inputs are kept in the store and persisted. `computeLinearPlan` (`src/algorithm/linear.ts`) is Best-Fit-Decreasing: parts go into the open bar with the least space left, otherwise the shortest available bar with the same cross-section (`width` × `thickness`, 0 = unspecified) and `material`. Older data had a free-text `profile` ("70×45 Accoya"); `parsePersistedState` converts it via `parseProfile`. Kerf is only added between parts; `linearTrim` is cut off at the bar start (trim + kerf). `LinearPlan` lives in its own `App` state and is rendered by `LinearDiagram` (HTML bars, not SVG) and `LinearResults`.

**Print / PDF:** `PrintSheet` / `LinearPrintSheet` are rendered next to the app with `hidden print:block`, while the app layout is `print:hidden`; "Drucken / PDF" just calls `window.print()`. Because the same `CutDiagram` renders twice, its SVG pattern ids come from `useId()`.

**Algorithm space vs. display space:** The algorithm works in raw stock `width × height`. `CutDiagram` transposes plates where `height > width` so the long edge is always drawn horizontally. Trim options (`trimLeft`/`trimTop`) are specified in *display* space; `computeCutPlan` maps them into algorithm space using the same `transposed` rule. Any code touching coordinates, trims, or highlights must respect this mapping. Pieces are identified across the diagram and cut list by their algorithm-space `(x, y)` plus plate number (`PieceHighlight` in `App.tsx`), enabling the bidirectional hover highlight.

**Tables and CSV:** All four tables (plates, pieces, bars, parts) use `itemColumns()` (`components/itemColumns.ts`) with the column order of the timber list export: `Pos, Name (CSV: Bezeichnung), Material, Anz, B, D, L` (+ `M` grain for 2D, `€` for stock). Row keys are generic (`name`, `length`); each table maps them to its type (2D: `length` → `height`, stock: `name` → `label`). `L` (Länge) is `height` in 2D. One parser, `parseCsv` in `utils/csvImport.ts`, serves all tables: it maps German/English headers (and the old `Profil` column), falls back to the table column order when there is no header row, skips leading metadata lines (`Projektname;…`), strips a BOM, auto-detects `;`, `,` or tab, and accepts decimal commas. A timber list's 8th column (Volumen) is ignored. CSV export writes the same format, so exports re-import. `InlineTable` routes multi-cell clipboard pastes (Excel rows) through the same import dialog.

**UI layout:** `App` switches on `useMediaQuery('(min-width: 1024px)')` between a 3-column desktop grid (input 500px | diagram | results 420px, sized so the input tables fit without horizontal scrolling) and a mobile tab layout (`MobileTabBar`). `StockTable`, `PiecesTable`, `LinearStockTable` and `LinearPartsTable` are thin wrappers around the generic `InlineTable` (inline editing, sorting, CSV import/export). `PiecesTable` still has a `useInlineTableForPieces` store flag (default `true`, not persisted) with a legacy read-only fallback table.
