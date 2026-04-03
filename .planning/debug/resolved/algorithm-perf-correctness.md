---
status: resolved
trigger: "Investigate and fix two bugs in src/algorithm/guillotine.ts - performance bug causing UI freeze on 40+ pieces, and correctness bug in MAX_DEPTH handling"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: Two confirmed bugs in placeOnPanel: (1) exhaustive search across all candidates instead of greedy pick causing exponential branching; (2) MAX_DEPTH early-return reports panelWidth*panelHeight as placedArea when zero pieces were placed, inflating scores.
test: Read algorithm source, verify structure matches described bugs, then apply targeted fixes.
expecting: After fix: MAX_CANDIDATES=3 limit reduces branching to polynomial; placedArea:0 at MAX_DEPTH gives correct scores.
next_action: Apply both fixes to guillotine.ts, run npm test

## Symptoms

expected: Algorithm should compute cut plans for 130+ pieces in under 2 seconds
actual: Algorithm hangs for 30+ seconds on just 40 pieces, freezing the UI
errors: No errors - just hangs
reproduction: Add 4 piece types with qty=10 each (40 total), click compute
started: Likely always been this way for larger inputs

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-03T00:00:00Z
  checked: guillotine.ts placeOnPanel loop structure (lines 94-206)
  found: Loop iterates ALL sorted pieces, each with up to 2 orientations, each launching 2 full recursive sub-trees (Split A + Split B). Deduplication by dimension key reduces same-dimension pieces but still tries every UNIQUE dimension at every level.
  implication: With 4 piece types × 2 orientations × 2 splits = up to 16 recursive calls per level. Call tree is exponential with depth.

- timestamp: 2026-04-03T00:00:00Z
  checked: guillotine.ts line 73-74 MAX_DEPTH early return
  found: Returns `placedArea: panelWidth * panelHeight` but `placements: []` — zero pieces placed, full area credited.
  implication: Scores for deep sub-trees are artificially inflated. The best-score selector may prefer a path that hit MAX_DEPTH (placing nothing) over a path that legitimately placed fewer pieces, producing incorrect results.

- timestamp: 2026-04-03T00:00:00Z
  checked: Algorithm comment at top of placeOnPanel (lines 50-61)
  found: Comment says "greedy" and "O(n log n) per level (no combinatorial explosion)" but implementation is exhaustive search across all candidates.
  implication: The intent is greedy but the implementation is not — comment and code disagree. Fix: limit candidates tried to MAX_CANDIDATES=3 (pick top candidates from sorted list only).

## Resolution

root_cause: |
  Bug 1 (PERF): placeOnPanel iterates ALL unique piece dimensions at each recursion level, trying 2 splits for each. With k unique dimensions, each level spawns up to 4k recursive calls, making overall complexity exponential in depth. For 4 piece types (≈8 unique orientations), that is ~16 sub-trees per level.
  Bug 2 (CORRECTNESS): MAX_DEPTH early return sets placedArea=panelWidth*panelHeight despite placing zero pieces. Score inflation causes the algorithm to prefer dead-end paths.

fix: |
  Bug 1: After sorting, take only the first MAX_CANDIDATES=3 entries from the sorted list before the outer loop. The deduplication by dimension key already prevents duplicates; the new cap ensures at most 3 candidates are explored per level regardless of how many unique dimensions exist.
  Bug 2: Change `placedArea: panelWidth * panelHeight` to `placedArea: 0` in the MAX_DEPTH early-return branch.

verification: |
  18/18 existing tests pass. Performance benchmark:
  - 132 pieces (4 types x qty 33): 1503ms, all placed, 6.8% waste
  - 200 pieces (4 types x qty 50): 1204ms, all placed, 5.9% waste
  Both well under the 2-second target for the 130+ piece requirement.
files_changed:
  - src/algorithm/guillotine.ts
