// src/algorithm/guillotine.ts
import { DEFAULT_KERF_MM } from '../constants'
import type {
  StockPlate,
  CutPiece,
  Placement,
  PlacedPlate,
  CutPlan,
  CutStep,
  CutNode,
  OptimizationPriority,
} from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canRotate(piece: CutPiece): boolean {
  return piece.grain === 'any'
}

function fitsOnStock(piece: CutPiece, stock: StockPlate): boolean {
  if (piece.thickness !== stock.thickness) return false
  if (piece.width <= stock.width && piece.height <= stock.height) return true
  if (canRotate(piece) && piece.height <= stock.width && piece.width <= stock.height) return true
  return false
}

function countNodes(node: CutNode): number {
  let count = 1
  if (node.children) {
    for (const child of node.children) count += countNodes(child)
  }
  return count
}

// ---------------------------------------------------------------------------
// Panel placement result
// ---------------------------------------------------------------------------

interface PanelResult {
  placements: Placement[]
  cutNode: CutNode | null
  placedArea: number
}

const MAX_DEPTH = 100

// ---------------------------------------------------------------------------
// Greedy guillotine placement (single-pass, no backtracking)
//
// Places the best-fitting piece at (0,0) of the panel, then recursively fills
// the two remaining sub-panels.  "Best-fitting" = largest piece that fits,
// ensuring O(n log n) per level (no combinatorial explosion).
//
// Split strategies:
//   Horizontal-first: cut at piece.height, fill right strip then bottom strip
//   Vertical-first:   cut at piece.width, fill bottom strip then right strip
//
// We try both splits for the chosen piece and pick the one with the better score.
// ---------------------------------------------------------------------------

function placeOnPanel(
  panelWidth: number,
  panelHeight: number,
  offsetX: number,
  offsetY: number,
  pieces: CutPiece[],
  kerf: number,
  priority: OptimizationPriority,
  depth = 0,
): PanelResult {
  if (depth >= MAX_DEPTH) {
    return { placements: [], cutNode: null, placedArea: panelWidth * panelHeight }
  }

  if (panelWidth <= 0 || panelHeight <= 0 || pieces.length === 0) {
    return { placements: [], cutNode: null, placedArea: 0 }
  }

  // Sort pieces: for 'least-cuts', prefer tall pieces (shelf rows); otherwise area-descending
  const sorted = priority === 'least-cuts'
    ? [...pieces].sort((a, b) => b.height - a.height)
    : [...pieces].sort((a, b) => b.width * b.height - a.width * a.height)

  const panelArea = panelWidth * panelHeight
  let bestResult: PanelResult | null = null
  let bestScore = -Infinity

  // Deduplicate by (id, rotated) to avoid redundant candidates at the same level.
  // Only try the first occurrence of each unique piece identity.
  const triedKeys = new Set<string>()

  for (let pieceIdx = 0; pieceIdx < sorted.length; pieceIdx++) {
    const piece = sorted[pieceIdx]

    const orientations: Array<{ pw: number; ph: number; rotated: boolean }> = [
      { pw: piece.width, ph: piece.height, rotated: false },
    ]
    if (canRotate(piece)) {
      orientations.push({ pw: piece.height, ph: piece.width, rotated: true })
    }

    for (const { pw, ph, rotated } of orientations) {
      if (pw > panelWidth || ph > panelHeight) continue

      // Skip if we already tried a piece with identical dimensions in the same orientation
      const key = `${pw}x${ph}`
      if (triedKeys.has(key)) continue
      triedKeys.add(key)

      // Remaining pieces after placing this one (remove first occurrence)
      const remaining = [...sorted]
      remaining.splice(pieceIdx, 1)

      const placement: Placement = { piece, x: offsetX, y: offsetY, rotated }

      // --- Split A: Horizontal-first ---
      // Horizontal cut at ph separates:
      //   - Right strip: (panelWidth - pw - kerf) × ph
      //   - Bottom strip: panelWidth × (panelHeight - ph - kerf)
      {
        const rightW = panelWidth - pw - kerf
        const rightH = ph
        const bottomW = panelWidth
        const bottomH = panelHeight - ph - kerf

        const rightResult = rightW > 0 && rightH > 0
          ? placeOnPanel(rightW, rightH, offsetX + pw + kerf, offsetY, remaining, kerf, priority, depth + 1)
          : { placements: [], cutNode: null, placedArea: 0 }

        const placedInRight = new Set(rightResult.placements.map(p => p.piece))
        const forBottom = remaining.filter(p => !placedInRight.has(p))

        const bottomResult = bottomW > 0 && bottomH > 0
          ? placeOnPanel(bottomW, bottomH, offsetX, offsetY + ph + kerf, forBottom, kerf, priority, depth + 1)
          : { placements: [], cutNode: null, placedArea: 0 }

        const allPlacements = [placement, ...rightResult.placements, ...bottomResult.placements]
        const totalPlaced = pw * ph + rightResult.placedArea + bottomResult.placedArea

        const children: CutNode[] = []
        if (rightResult.cutNode) children.push(rightResult.cutNode)
        if (bottomResult.cutNode) children.push(bottomResult.cutNode)

        const cutNode: CutNode = {
          direction: 'horizontal',
          position: ph,
          panelWidth,
          panelHeight,
          piece: placement,
          children: children.length > 0 ? children : undefined,
        }

        const score = scoreResult(totalPlaced, panelArea, cutNode, priority)
        if (score > bestScore) {
          bestScore = score
          bestResult = { placements: allPlacements, cutNode, placedArea: totalPlaced }
        }
      }

      // --- Split B: Vertical-first ---
      // Vertical cut at pw separates:
      //   - Bottom strip: pw × (panelHeight - ph - kerf)
      //   - Right strip: (panelWidth - pw - kerf) × panelHeight
      {
        const bottomW = pw
        const bottomH = panelHeight - ph - kerf
        const rightW = panelWidth - pw - kerf
        const rightH = panelHeight

        const bottomResult = bottomW > 0 && bottomH > 0
          ? placeOnPanel(bottomW, bottomH, offsetX, offsetY + ph + kerf, remaining, kerf, priority, depth + 1)
          : { placements: [], cutNode: null, placedArea: 0 }

        const placedInBottom = new Set(bottomResult.placements.map(p => p.piece))
        const forRight = remaining.filter(p => !placedInBottom.has(p))

        const rightResult = rightW > 0 && rightH > 0
          ? placeOnPanel(rightW, rightH, offsetX + pw + kerf, offsetY, forRight, kerf, priority, depth + 1)
          : { placements: [], cutNode: null, placedArea: 0 }

        const allPlacements = [placement, ...bottomResult.placements, ...rightResult.placements]
        const totalPlaced = pw * ph + bottomResult.placedArea + rightResult.placedArea

        const children: CutNode[] = []
        if (bottomResult.cutNode) children.push(bottomResult.cutNode)
        if (rightResult.cutNode) children.push(rightResult.cutNode)

        const cutNode: CutNode = {
          direction: 'vertical',
          position: pw,
          panelWidth,
          panelHeight,
          piece: placement,
          children: children.length > 0 ? children : undefined,
        }

        const score = scoreResult(totalPlaced, panelArea, cutNode, priority)
        if (score > bestScore) {
          bestScore = score
          bestResult = { placements: allPlacements, cutNode, placedArea: totalPlaced }
        }
      }
    }
  }

  if (!bestResult) {
    return { placements: [], cutNode: null, placedArea: 0 }
  }

  return bestResult
}

function scoreResult(
  placedArea: number,
  panelArea: number,
  cutNode: CutNode,
  priority: OptimizationPriority,
): number {
  const areaRatio = panelArea > 0 ? placedArea / panelArea : 0
  const cutCount = countNodes(cutNode)
  const MAX_CUTS = 50 // normalization constant
  const cutRatio = 1 - Math.min(cutCount / MAX_CUTS, 1)

  if (priority === 'least-waste') {
    return areaRatio
  }

  if (priority === 'least-cuts') {
    // Strongly reward fewer cuts; area utilisation is secondary
    return 0.2 * areaRatio + 0.8 * cutRatio
  }

  // balanced: 0.6 × area ratio + 0.4 × (1 - cuts / max_cuts)
  return 0.6 * areaRatio + 0.4 * cutRatio
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeCutPlan(
  stockPlates: StockPlate[],
  cutPieces: CutPiece[],
  kerf = DEFAULT_KERF_MM,
  priority: OptimizationPriority = 'least-waste',
  trimLeft = 0,
  trimTop = 0,
): CutPlan {
  // Expand by quantity — each instance must be a distinct object so
  // reference-based tracking in placeOnPanel works correctly.
  const expanded: CutPiece[] = []
  for (const piece of cutPieces) {
    for (let i = 0; i < piece.quantity; i++) expanded.push({ ...piece, quantity: 1 })
  }

  // Track available physical plate counts
  const available = new Map<string, { stock: StockPlate; remaining: number }>()
  for (const s of stockPlates) {
    available.set(s.id, { stock: s, remaining: s.quantity })
  }

  const plates: PlacedPlate[] = []
  const plateIndexCounters = new Map<string, number>()
  let unplacedPieces = [...expanded]

  // Keep opening new plates until all pieces are placed or no plate fits
  while (unplacedPieces.length > 0) {
    const placeable = unplacedPieces.filter(p => stockPlates.some(s => fitsOnStock(p, s)))
    if (placeable.length === 0) break

    // Pick smallest available stock that fits the largest remaining piece
    const sortedPlaceable = [...placeable].sort((a, b) => b.width * b.height - a.width * a.height)
    const largestPiece = sortedPlaceable[0]

    let bestStock: { stock: StockPlate; av: { stock: StockPlate; remaining: number } } | null = null
    for (const av of available.values()) {
      if (av.remaining <= 0) continue
      if (!fitsOnStock(largestPiece, av.stock)) continue
      const area = av.stock.width * av.stock.height
      if (!bestStock || area < bestStock.stock.width * bestStock.stock.height) {
        bestStock = { stock: av.stock, av }
      }
    }

    if (!bestStock) {
      // Largest piece can't fit any stock — skip it
      unplacedPieces = unplacedPieces.filter(p => p !== largestPiece)
      continue
    }

    bestStock.av.remaining--
    const idx = plateIndexCounters.get(bestStock.stock.id) ?? 0
    plateIndexCounters.set(bestStock.stock.id, idx + 1)

    const { stock } = bestStock

    // Determine if plate display is transposed (L=height is shown horizontally)
    const transposed = stock.height > stock.width
    // Map display-space trim to algorithm coordinate space
    const algoTrimX = transposed ? trimTop : trimLeft
    const algoTrimY = transposed ? trimLeft : trimTop
    const algoOffsetX = algoTrimX > 0 ? algoTrimX + kerf : 0
    const algoOffsetY = algoTrimY > 0 ? algoTrimY + kerf : 0
    const usableW = Math.max(1, stock.width - algoOffsetX)
    const usableH = Math.max(1, stock.height - algoOffsetY)

    // Only pass pieces that actually fit this specific stock plate (thickness + dimensions)
    const placeableOnThisStock = placeable.filter(p => fitsOnStock(p, stock))

    const result = placeOnPanel(
      usableW,
      usableH,
      algoOffsetX,
      algoOffsetY,
      placeableOnThisStock,
      kerf,
      priority,
    )

    if (result.placements.length === 0) {
      // Guard against infinite loop
      bestStock.av.remaining++
      plateIndexCounters.set(stock.id, idx)
      break
    }

    const totalArea = stock.width * stock.height
    const placedArea = result.placements.reduce((sum, p) => {
      const pw = p.rotated ? p.piece.height : p.piece.width
      const ph = p.rotated ? p.piece.width : p.piece.height
      return sum + pw * ph
    }, 0)
    const wasteArea = Math.max(0, totalArea - placedArea)
    const wastePct = (wasteArea / totalArea) * 100

    plates.push({
      stock,
      plateIndex: idx,
      placements: result.placements,
      wasteArea,
      wastePct,
      cutTree: result.cutNode ?? undefined,
    })

    const placedSet = new Set(result.placements.map(p => p.piece))
    unplacedPieces = unplacedPieces.filter(p => !placedSet.has(p))
  }

  // Aggregate unplaced counts by piece id
  const unplacedCounts = new Map<string, { piece: CutPiece; count: number }>()
  for (const p of unplacedPieces) {
    const existing = unplacedCounts.get(p.id)
    if (existing) {
      existing.count++
    } else {
      unplacedCounts.set(p.id, { piece: p, count: 1 })
    }
  }
  const unplacedResult: CutPiece[] = Array.from(unplacedCounts.values()).map(({ piece, count }) => ({
    ...piece,
    quantity: count,
  }))

  const totalWasteArea = plates.reduce((s, p) => s + p.wasteArea, 0)
  const totalPlateArea = plates.reduce((s, p) => s + p.stock.width * p.stock.height, 0)
  const totalWastePct = totalPlateArea > 0 ? (totalWasteArea / totalPlateArea) * 100 : 0

  const unusedStockPlates = Array.from(available.values())
    .filter(({ remaining }) => remaining > 0)
    .map(({ stock, remaining }) => ({ stock, quantity: remaining }))

  const cutTrees = plates.map(p => p.cutTree).filter((t): t is CutNode => t != null)

  return {
    plates,
    totalWastePct,
    unusedStockPlates,
    unplacedPieces: unplacedResult,
    cutTrees: cutTrees.length > 0 ? cutTrees : undefined,
  }
}

// ---------------------------------------------------------------------------
// Cut sequence generation
// ---------------------------------------------------------------------------

function traverseCutTree(node: CutNode, stepCounter: { n: number }, steps: CutStep[]): void {
  const posLabel = node.direction === 'horizontal'
    ? `Schnitt ${stepCounter.n}: Horizontal bei Y=${node.position}mm`
    : `Schnitt ${stepCounter.n}: Vertikal bei X=${node.position}mm`

  steps.push({
    direction: node.direction,
    position: node.position,
    context: posLabel,
    panelWidth: node.panelWidth,
    panelHeight: node.panelHeight,
    pieceName: node.piece?.piece.name ?? undefined,
  })
  stepCounter.n++

  if (node.children) {
    for (const child of node.children) {
      traverseCutTree(child, stepCounter, steps)
    }
  }
}

export function generateCutSequence(plate: PlacedPlate, _kerf = DEFAULT_KERF_MM): CutStep[] {
  if (plate.placements.length <= 1) return []

  // If we have a cut tree, traverse it
  if (plate.cutTree) {
    const steps: CutStep[] = []
    const counter = { n: 1 }
    traverseCutTree(plate.cutTree, counter, steps)
    return steps
  }

  // Fallback: derive cuts from placement positions
  const steps: CutStep[] = []
  let stepNum = 1

  const yPositions = new Set<number>()
  const xPositions = new Set<number>()

  for (const p of plate.placements) {
    const ph = p.rotated ? p.piece.width : p.piece.height
    const pw = p.rotated ? p.piece.height : p.piece.width
    yPositions.add(p.y + ph)
    xPositions.add(p.x + pw)
  }

  yPositions.delete(plate.stock.height)
  xPositions.delete(plate.stock.width)

  const sortedY = Array.from(yPositions).sort((a, b) => a - b)
  for (const y of sortedY) {
    steps.push({
      direction: 'horizontal',
      position: y,
      context: `Schnitt ${stepNum}: Horizontal bei Y=${y} mm`,
    })
    stepNum++
  }

  const sortedX = Array.from(xPositions).sort((a, b) => a - b)
  for (const x of sortedX) {
    steps.push({
      direction: 'vertical',
      position: x,
      context: `Schnitt ${stepNum}: Vertikal bei X=${x} mm`,
    })
    stepNum++
  }

  return steps
}
