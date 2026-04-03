# Phase 1 Migration Tests (InlineTable MVP)

- Objective: define minimal regression tests for the Phase 1 migration path of PiecesTable behind a feature flag.
- Scope:
  - Ensure InlineTable path renders correctly when feature flag is enabled.
  - Ensure lightweight fallback path renders correctly when feature flag is disabled.
  - Validate that CSV export/import behavior remains consistent across both paths.
- Approach:
  - Document test plan; add any skeleton tests in your preferred test framework when dependencies are available.
