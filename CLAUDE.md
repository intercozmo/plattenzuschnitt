# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Plattenzuschnitt is a client-only PWA that computes guillotine cut plans for wood panels (stock sheets → cut pieces). No backend; state lives in `localStorage`. All UI text is German.

See also `AGENTS.md` (conventions: functional components, camelCase/PascalCase, imperative commit messages). Versions: React 19, Tailwind 4, Vite 8, TypeScript 6.

## Commands

- `npm ci` — install
- `npm run dev` — dev server (port 5173, served under `/plattenzuschnitt/`)
- `npm run build` — `tsc` typecheck + Vite build (this is the only type/lint gate; there is no ESLint/Prettier)
- `npm test` — Vitest, runs once (`vitest run`); `npm run test:watch` for watch mode
- Single test: `npx vitest run src/algorithm/guillotine.test.ts -t "generateCutSequence"`

Tests run in the `node` environment (no DOM), so only pure logic (`src/algorithm/`, `src/utils/`) is unit-tested.

## Deployment

`.github/workflows/deploy.yml` runs tests + build on push to `main` and deploys `dist/` to GitHub Pages. `vite.config.ts` sets `base: '/plattenzuschnitt/'` — required for Pages; don't remove it. `vite-plugin-pwa` generates the service worker/manifest.

## Architecture

**Data flow:** `store.ts` (Zustand) holds inputs → user clicks "Berechnen" in `Header` → `App.handleCompute` reads `useStore.getState()` and calls `computeCutPlan(...)` → the resulting `CutPlan` is kept in `App`'s local `useState` (not in the store, not persisted) and passed as props to `DiagramPanel` and `ResultsPanel`. Plans are only recomputed on explicit click, never reactively.

- When `grainEnabled` is false, `App` rewrites every piece to `grain: 'any'` before computing — the algorithm itself only looks at `piece.grain`.
- `MAX_TOTAL_PIECES` (500, in `constants.ts`) caps the expanded piece count; compute is disabled above it.

**Persistence:** `store.ts` subscribes (with `shallow` equality) and writes a subset of state to `localStorage` key `plattenzuschnitt_v1` via `persistence.ts`. `loadState()` validates and back-fills missing fields (e.g. `thickness` defaults to 18, invalid `grain` → `'any'`). When adding a persisted field, update all three: `AppState`, the `useStore.subscribe` selector/saver, and `PersistedState` + `loadState()` validation.

**Algorithm (`src/algorithm/guillotine.ts`):**
- `computeCutPlan` expands pieces by `quantity` into distinct objects (placement tracking is by object reference), then repeatedly opens the smallest available stock plate that fits the largest remaining piece and fills it with `placeOnPanel`.
- `placeOnPanel` is a recursive greedy guillotine packer: place one piece at the panel origin, split the remainder into two sub-panels (kerf subtracted), recurse. Both split orders are compared only down to `SPLIT_COMPARE_DEPTH`; deeper levels use a heuristic to avoid exponential blow-up. `scoreResult` weights area vs. cut count according to `priority` (`least-waste` / `least-cuts` / `balanced`).
- A piece fits a stock plate only if `thickness` matches exactly. Rotation is allowed only for `grain === 'any'`.
- Each `PlacedPlate` carries a `cutTree` (`CutNode`); `generateCutSequence` flattens it into human-readable German `CutStep`s used by `CutList`.

**Algorithm space vs. display space:** The algorithm works in raw stock `width × height`. `CutDiagram` transposes plates where `height > width` so the long edge is always drawn horizontally. Trim options (`trimLeft`/`trimTop`) are specified in *display* space; `computeCutPlan` maps them into algorithm space using the same `transposed` rule. Any code touching coordinates, trims, or highlights must respect this mapping. Pieces are identified across the diagram and cut list by their algorithm-space `(x, y)` plus plate number (`PieceHighlight` in `App.tsx`), enabling the bidirectional hover highlight.

**Dimension naming:** In the UI, `L` (Länge) maps to `height` and `B` (Breite) maps to `width`. CSV import (`utils/csvImport.ts`) accepts German and English headers and grain values (`längs`→`horizontal`, `quer`→`vertical`), with `;` or `,` auto-detected.

**UI layout:** `App` switches on `useMediaQuery('(min-width: 1024px)')` between a 3-column desktop grid (input | diagram | results) and a mobile tab layout (`MobileTabBar`). `StockTable` and `PiecesTable` are thin wrappers around the generic `InlineTable` (inline editing, sorting, CSV import/export). `PiecesTable` still has a `useInlineTableForPieces` store flag (default `true`, not persisted) with a legacy read-only fallback table.
