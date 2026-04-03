# InlineTable MVP Spec (Draft)

## Objective
- Create a minimal, reusable InlineTable core that unifies StockTable and PiecesTable and serves as the foundation for future features (exports, templates, multi-stock support).

## API Surface (Minimal, stable)
- InlineTable props:
  - columns: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right'; width?: number }>
  - data: Array<Record<string, any>>
  - renderCell?: (row: any, column: { key: string; label: string; align?: string; width?: number }) => React.ReactNode
  - onRowClick?: (row: any) => void
  - className?: string
  - keyExtractor?: (row: any) => string
  - style?: React.CSSProperties

Notes:
- The InlineTable should render a header row using the columns labels and a body with one row per data item.
- If renderCell is provided, it should be used for each cell with the corresponding row and column metadata. Otherwise, a default cell renderer should display row[column.key].

## Compatibility & Migration shim
- InlineTable must accept a subset of StockTable/PiecesTable props to render the same UI when used in existing pages.
- A compatibility wrapper should be provided to allow StockTable and PiecesTable to progressively migrate to InlineTable without breaking the current public API.
- All existing tests should pass with the InlineTable present, even if not all InlinesTable features are used yet.

## Migration Plan (Phase-driven)
- Phase 0 (InlineTable MVP): Implement InlineTable with the minimal API and render path.
- Phase 1: Migrate PiecesTable to InlineTable behind a feature flag; ensure it renders the same visuals as before.
- Phase 2: Plan StockTable migration and expand the InlineTable API as needed (sorting, column widths, virtualization, etc.).

## Testing & Accessibility
- Unit tests: render with sample data, verify headers, rows, and cells render as expected.
- Accessibility: ensure table semantics (role, aria labels) are correct for screen readers.
- Visuals: styling to align with existing Tailwind CSS theme tokens.

## Milestones & Metrics
- Milestone 1: InlineTable component exists with API docs and basic tests.
- Milestone 2: PiecesTable migrated behind a feature flag in a single PR with no regressions.
- Milestone 3: Document migration guide for future table components.

## Export roadmap (future)
- Once InlineTable MVP is stable, plan first export capability (PDF/JPG) built on top of the core with a feature flag.

"Phase 1 readiness" success criteria:
- InlineTable API surface defined and code-checked.
- PieceTable migration plan with a minimal, testable migration path behind a feature flag.
- Tests updated to cover the new core and the migration path.
