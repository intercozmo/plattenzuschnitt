# Visual Improvements v0.2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add waste hatching, rest labels in cut sequence, and move dimension annotations to bottom+right.

**Architecture:** Three independent visual changes in `CutDiagram.tsx` and one algorithm change in `guillotine.ts` + display change in `CutList.tsx`. No type changes needed.

**Tech Stack:** React, SVG, TypeScript, Vitest

---

### Task 1: Waste hatching pattern in CutDiagram

**Files:**
- Modify: `src/components/CutDiagram.tsx:156-190`

- [ ] **Step 1: Add waste hatching SVG pattern to `<defs>`**

In `CutDiagram.tsx`, add a new pattern inside the existing `<defs>` block (after the existing `stripePatternId` pattern on line 156):

```tsx
const wastePatternId = `waste-hatch-${plate.stock.id}-${plate.plateIndex}`
```

Add this before the `return` statement (around line 138, after `stripePatternId`).

Then inside `<defs>` (after the existing `<pattern>` on line 156), add:

```tsx
<pattern id={wastePatternId} patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
  <line x1="0" y1="0" x2="0" y2="40" stroke="#e11d48" strokeWidth="6" strokeOpacity="0.35" />
</pattern>
```

- [ ] **Step 2: Replace waste rectangle rendering with 3-layer approach**

Replace the waste rectangle rendering block (lines 165-190, inside `{wasteRects.map(...)}`) with:

```tsx
{wasteRects.map((wr, i) => {
  const { x, y, w, h } = toDisplayRect(wr.x, wr.y, wr.width, wr.height, transposed)
  return (
    <g key={`waste-${i}`}>
      {/* Layer 1: Rosa background */}
      <rect x={x} y={y} width={w} height={h}
        fill="#fce7f3" fillOpacity={0.6} />
      {/* Layer 2: Diagonal hatching */}
      <rect x={x} y={y} width={w} height={h}
        fill={`url(#${wastePatternId})`} />
      {/* Layer 3: Dashed border */}
      <rect x={x} y={y} width={w} height={h}
        fill="none" stroke="#f9a8d4" strokeWidth={3} strokeDasharray="20 8" />
      {w > 100 && h > 60 && (
        <>
          <text x={x + w / 2} y={y + h / 2 - 20}
            textAnchor="middle" fontSize={40} fill="#be185d">Rest</text>
          <text x={x + w / 2} y={y + h / 2 + 30}
            textAnchor="middle" fontSize={34} fill="#db2777">
            {w}×{h}
          </text>
        </>
      )}
    </g>
  )
})}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript or Vite errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CutDiagram.tsx
git commit -m "feat: add diagonal hatching to waste areas in cut diagram"
```

---

### Task 2: Rest labels in cut sequence

**Files:**
- Modify: `src/algorithm/guillotine.ts:389-409` (traverseCutTree function)

- [ ] **Step 1: Write a test for rest labels**

In `src/algorithm/guillotine.test.ts`, add a test that verifies `generateCutSequence` produces `pieceName` with rest dimensions for non-piece cuts. Add this at the end of the file, inside the existing `describe('computeCutPlan', ...)` block:

```typescript
it('generateCutSequence includes rest dimensions in pieceName', () => {
  const stocks: StockPlate[] = [
    { id: 's1', label: '', width: 1000, height: 500, thickness: 18, grain: 'any', quantity: 1 },
  ]
  const pieces: CutPiece[] = [
    { id: 'p1', name: 'A', width: 400, height: 300, thickness: 18, quantity: 1, grain: 'any' },
  ]
  const plan = computeCutPlan(stocks, pieces, 3)
  expect(plan.plates.length).toBe(1)
  const steps = generateCutSequence(plan.plates[0])
  // With one piece on a larger plate, cuts should exist and at least one
  // step should have a pieceName starting with "Rest"
  const restSteps = steps.filter(s => s.pieceName?.startsWith('Rest'))
  expect(restSteps.length).toBeGreaterThan(0)
  // Rest label should contain dimensions in the format "Rest WxH mm"
  for (const step of restSteps) {
    expect(step.pieceName).toMatch(/^Rest \d+×\d+ mm$/)
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/algorithm/guillotine.test.ts`
Expected: The new test fails — `restSteps.length` is 0 because `pieceName` is either a piece name or `undefined`.

- [ ] **Step 3: Implement rest label logic in `traverseCutTree`**

In `src/algorithm/guillotine.ts`, modify the `traverseCutTree` function (around line 389). Replace the `pieceName` assignment:

Current code (line 400):
```typescript
pieceName: node.piece?.piece.name ?? undefined,
```

Replace the entire `steps.push({...})` block (lines 394-401) with:

```typescript
  // Determine pieceName: use piece name if available, otherwise compute rest dimensions
  let pieceName: string | undefined = node.piece?.piece.name ?? undefined
  if (!pieceName) {
    // This cut produces a rest area — compute its dimensions
    if (node.direction === 'horizontal') {
      // Horizontal cut at position: rest is below the cut
      const restW = node.panelWidth
      const restH = node.panelHeight - node.position
      if (restW > 0 && restH > 0) {
        pieceName = `Rest ${restW}×${restH} mm`
      }
    } else {
      // Vertical cut at position: rest is to the right of the cut
      const restW = node.panelWidth - node.position
      const restH = node.panelHeight
      if (restW > 0 && restH > 0) {
        pieceName = `Rest ${restW}×${restH} mm`
      }
    }
  }

  steps.push({
    direction: node.direction,
    position: node.position,
    context: posLabel,
    panelWidth: node.panelWidth,
    panelHeight: node.panelHeight,
    pieceName,
  })
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/algorithm/guillotine.test.ts`
Expected: All 18 tests pass (17 existing + 1 new).

- [ ] **Step 5: Run full build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/algorithm/guillotine.ts src/algorithm/guillotine.test.ts
git commit -m "feat: show rest dimensions in cut sequence labels"
```

---

### Task 3: Move dimension annotations to bottom + right

**Files:**
- Modify: `src/components/CutDiagram.tsx:80-88` (margin constants + viewBox) and lines 335-357 (annotation SVG)

- [ ] **Step 1: Change margin constants and viewBox**

In `CutDiagram.tsx`, replace the margin and viewBox block (lines 80-88):

```tsx
  // Extra margin for dimension annotations (in SVG units)
  const marginLeft = 110
  const marginTop = 70
  const vbW = svgW + marginLeft
  const vbH = svgH + marginTop

  const displayW = containerWidth || 400
  const displayH = (vbH / vbW) * displayW
```

With:

```tsx
  // Extra margin for dimension annotations (bottom + right, in SVG units)
  const marginBottom = 70
  const marginRight = 110
  const vbW = svgW + marginRight
  const vbH = svgH + marginBottom

  const displayW = containerWidth || 400
  const displayH = (vbH / vbW) * displayW
```

- [ ] **Step 2: Update SVG viewBox attribute**

Replace the viewBox attribute on the `<svg>` element (line 152):

```tsx
viewBox={`-${marginLeft} -${marginTop} ${vbW} ${vbH}`}
```

With:

```tsx
viewBox={`0 0 ${vbW} ${vbH}`}
```

- [ ] **Step 3: Replace L annotation (top → bottom)**

Replace the L dimension annotation block (lines 335-344):

```tsx
          {/* L dimension annotation (top) */}
          <g stroke="#64748b" strokeWidth={3} fill="none">
            <line x1={0} y1={-marginTop + 20} x2={svgW} y2={-marginTop + 20} />
            <line x1={0} y1={-marginTop + 8} x2={0} y2={-marginTop + 32} />
            <line x1={svgW} y1={-marginTop + 8} x2={svgW} y2={-marginTop + 32} />
          </g>
          <text x={svgW / 2} y={-marginTop + 12} textAnchor="middle"
            fontSize={38} fill="#334155" fontWeight="500">
            L = {svgW} mm
          </text>
```

With:

```tsx
          {/* L dimension annotation (bottom) — text centered on line */}
          {(() => {
            const ly = svgH + 35
            const labelText = `L ${svgW}`
            // Approximate text width for gap in line (8px per char at fontSize 38)
            const textW = labelText.length * 20
            const gapStart = svgW / 2 - textW / 2
            const gapEnd = svgW / 2 + textW / 2
            return (
              <g>
                <g stroke="#000" strokeWidth={3} fill="none">
                  <line x1={0} y1={ly} x2={gapStart - 5} y2={ly} />
                  <line x1={gapEnd + 5} y1={ly} x2={svgW} y2={ly} />
                  <line x1={0} y1={ly - 12} x2={0} y2={ly + 12} />
                  <line x1={svgW} y1={ly - 12} x2={svgW} y2={ly + 12} />
                </g>
                <rect x={gapStart - 5} y={ly - 22} width={textW + 10} height={30} fill="white" />
                <text x={svgW / 2} y={ly + 2} textAnchor="middle"
                  fontSize={38} fill="#000" fontWeight="500">
                  {labelText}
                </text>
              </g>
            )
          })()}
```

- [ ] **Step 4: Replace B annotation (left → right)**

Replace the B dimension annotation block (lines 346-357 approximately, right after the L annotation):

```tsx
          {/* B dimension annotation (left) */}
          <g stroke="#64748b" strokeWidth={3} fill="none">
            <line x1={-marginLeft + 25} y1={0} x2={-marginLeft + 25} y2={svgH} />
            <line x1={-marginLeft + 12} y1={0} x2={-marginLeft + 38} y2={0} />
            <line x1={-marginLeft + 12} y1={svgH} x2={-marginLeft + 38} y2={svgH} />
          </g>
          <text
            x={-marginLeft + 15} y={svgH / 2}
            textAnchor="middle" fontSize={38} fill="#334155" fontWeight="500"
            transform={`rotate(-90, ${-marginLeft + 15}, ${svgH / 2})`}>
            B = {svgH} mm
          </text>
```

With:

```tsx
          {/* B dimension annotation (right) — text centered on line, rotated -90° */}
          {(() => {
            const bx = svgW + 55
            const labelText = `B ${svgH}`
            const textW = labelText.length * 20
            const gapStart = svgH / 2 - textW / 2
            const gapEnd = svgH / 2 + textW / 2
            return (
              <g>
                <g stroke="#000" strokeWidth={3} fill="none">
                  <line x1={bx} y1={0} x2={bx} y2={gapStart - 5} />
                  <line x1={bx} y1={gapEnd + 5} x2={bx} y2={svgH} />
                  <line x1={bx - 12} y1={0} x2={bx + 12} y2={0} />
                  <line x1={bx - 12} y1={svgH} x2={bx + 12} y2={svgH} />
                </g>
                <rect x={bx - 22} y={gapStart - 5} width={30} height={textW + 10} fill="white" />
                <text x={bx} y={svgH / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={38} fill="#000" fontWeight="500"
                  transform={`rotate(-90, ${bx}, ${svgH / 2})`}>
                  {labelText}
                </text>
              </g>
            )
          })()}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No TypeScript or Vite errors.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All 18 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/CutDiagram.tsx
git commit -m "feat: move dimension annotations to bottom and right"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 18/18 tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 3: Visual spot-check**

Run: `npm run dev`

Check in browser:
1. Waste areas have pink background + diagonal hatching (not solid pink)
2. Cut sequence table shows "Rest {w}×{h} mm" instead of "—"
3. Dimension annotations are at bottom (L) and right (B), black, text on line
4. Anschnitt strips still show correctly (amber hatching)
5. Mobile view: annotations not clipped

- [ ] **Step 4: Final commit (if any visual tweaks needed)**

```bash
git add -A
git commit -m "fix: visual adjustments from spot-check"
```
