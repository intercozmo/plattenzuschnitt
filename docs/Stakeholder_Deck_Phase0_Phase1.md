# Stakeholder Deck: Phase 0 & Phase 1

## Slide 1 — Phase 0: Goals & Plan
- Objective: Finish v0.2.1 release, stabilize baseline, prune stale work, and lock in InlineTable MVP spec to enable Phase 1—scoped, low-risk core refactor behind a feature flag.
- Key outcomes: stable release, clear migration path, minimized risk to current sprint cadence.
- Risks: schedule slippage if QA uncovers critical issues; labels and milestones not aligned; ensure no regressions.

## Slide 2 — Phase 1: InlineTable MVP
- Objective: introduce a reusable InlineTable core that unifies StockTable and PiecesTable behind a minimal API.
- Approach: deliver a scoped MVP behind a feature flag; migrate PiecesTable in one PR; refine API in subsequent tweaks.
- Success criteria: InlineTable component exists with a documented API; PiecesTable migration behind a feature flag; tests/docs updated; no user-visible regressions.

## Slide 3 — Risks, Milestones, and Next Steps
- Risks & mitigations: refactor risk mitigated by feature flag, small PRs, and CI gates; baseline cleanup reduces drift.
- Milestones: Phase 0 release, InlineTable MVP spec finalization, Phase 1 migration PR, Phase 2 export roadmap planning.
- Next steps: Phase 0 completion, Phase 1 MVP API finalize, migration PR, office-hours check-in, export roadmap planning.
