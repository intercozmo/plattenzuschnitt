# Phase 1 Migration Guide: PiecesTable → InlineTable (behind feature flag)

- Objective: implement a safe migration path that toggles rendering between the old PiecesTable UI and the new InlineTable core behind a feature flag.
- Key concepts:
  - useInlineTableForPieces flag gates rendering path
  - Phase 1 PR should only touch rendering path and minimal glue to switch between modes
  - Migration should preserve visuals and behavior when the flag is enabled

- Implementation plan:
  1) Ensure store exposes useInlineTableForPieces flag and setter.
  2) In PiecesTable.tsx, render InlineTable when flag is on; render lightweight fallback when off.
  3) Create a small PR that flips the flag and validates UI parity; add regression tests (unit-level where possible) and docs.
  4) Validate CSV export/import continuity across modes.

- Testing strategy:
  - UI parity checks on both modes where feasible.
  - Tests cover the conditional rendering logic for the flag.

- Rollout plan:
  - Start with flag off in a dedicated environment to validate fallback UI.
  - Then flip to on in staging and verify no regressions.
