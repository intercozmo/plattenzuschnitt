// src/algorithm/guillotine.ts
import { DEFAULT_KERF_MM } from '../constants'
import { itemLabel, materialMatches } from '../utils/items'
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

// Grain: 'horizontal' = längs (along the length L = height), 'vertical' = quer.
// A piece's grain must run parallel to the plate's grain: same direction →
// placed as entered, different direction → rotated by 90°. If either the
// piece or the plate has no grain, both orientations are allowed.
type Orientation = 'both' | 'normal' | 'rotated'

function orientationFor(piece: CutPiece, stock: StockPlate): Orientation {
  if (piece.grain === 'any' || stock.grain === 'any') return 'both'
  return piece.grain === stock.grain ? 'normal' : 'rotated'
}

// Usable area of a plate after the trim strips (display-space trims mapped to
// algorithm space; a portrait plate is drawn with its length horizontal)
function usableArea(stock: StockPlate, kerf: number, trimLeft: number, trimTop: number) {
  const transposed = stock.height > stock.width
  const trimX = transposed ? trimTop : trimLeft
  const trimY = transposed ? trimLeft : trimTop
  const offsetX = trimX > 0 ? trimX + kerf : 0
  const offsetY = trimY > 0 ? trimY + kerf : 0
  return { offsetX, offsetY, width: Math.max(1, stock.width - offsetX), height: Math.max(1, stock.height - offsetY) }
}

function fitsOnStock(piece: CutPiece, stock: StockPlate, usable: { width: number; height: number }): boolean {
  if (piece.thickness !== stock.thickness) return false
  if (!materialMatches(piece.material, stock.material)) return false
  const orientation = orientationFor(piece, stock)
  if (orientation !== 'rotated' && piece.width <= usable.width && piece.height <= usable.height) return true
  if (orientation !== 'normal' && piece.height <= usable.width && piece.width <= usable.height) return true
  return false
}

// ---------------------------------------------------------------------------
// Guillotine search
//
// Places the first piece (in sort order) that fits at the panel origin, then
// recursively fills the two remaining sub-panels. Both orientations of that
// piece are tried; for each, both split strategies are compared at shallow
// depths, deeper down one split is chosen heuristically:
//   Horizontal-first: cut at piece height, fill right strip then bottom strip
//   Vertical-first:   cut at piece width, fill bottom strip then right strip
//
// The search works on list positions and relative coordinates and only builds
// Placement / CutNode objects for the final result. Identical subproblems
// (same panel size, same sequence of piece types, same depth class) are
// memoized; they occur very often because the two orientations and split
// strategies re-explore the same remainders.
// ---------------------------------------------------------------------------

const MAX_DEPTH = 100
// At shallow depths we compare both split strategies (horizontal-first vs
// vertical-first) to pick the better layout. Beyond this depth, we use a
// simple heuristic to choose ONE split, cutting the branching factor in half.
const SPLIT_COMPARE_DEPTH = 3

// Result of a (sub-)panel search. `placed` holds positions in the input list
// in placement order; the tree refers to entries of `placed` by index, so a
// memoized result can be reused for any list with the same type sequence.
interface SearchResult {
  placed: number[]
  area: number        // placed piece area
  tree: TreeNode | null
  reach: number       // deepest recursion level used below this call
}

interface TreeNode {
  direction: 'horizontal' | 'vertical'
  position: number
  panelWidth: number
  panelHeight: number
  rotated: boolean
  // Sub-panels: offset relative to this panel and index offset into `placed`
  children: Array<{ node: TreeNode; ox: number; oy: number; k: number }>
}

const EMPTY: SearchResult = { placed: [], area: 0, tree: null, reach: 0 }

interface SearchContext {
  pieces: CutPiece[]        // sorted by the priority's order
  orientation: Orientation[] // allowed orientations per piece on this plate
  typeCode: string[]        // one char per piece: same char = same width/height/orientation
  kerf: number
  priority: OptimizationPriority
  memo: Map<string, SearchResult>
}

function search(ctx: SearchContext, w: number, h: number, list: number[], depth: number): SearchResult {
  if (depth >= MAX_DEPTH) return { ...EMPTY, reach: 0 }
  if (w <= 0 || h <= 0 || list.length === 0) return EMPTY

  const depthClass = depth < SPLIT_COMPARE_DEPTH ? depth : SPLIT_COMPARE_DEPTH
  // Key: panel size, depth class and the run-length encoded type sequence
  let key = `${w},${h},${depthClass}`
  for (let pos = 0; pos < list.length;) {
    const code = ctx.typeCode[list[pos]]
    let run = 1
    while (pos + run < list.length && ctx.typeCode[list[pos + run]] === code) run++
    key += code + run
    pos += run
  }
  const cached = ctx.memo.get(key)
  if (cached && depth + cached.reach < MAX_DEPTH) {
    return cached.placed.length === 0 ? cached : { ...cached, placed: cached.placed.map(pos => list[pos]) }
  }

  const result = searchUncached(ctx, w, h, list, depth)
  // Store with list positions; skip if the depth limit cut the search short
  if (depth + result.reach < MAX_DEPTH) {
    const posOf = new Map(list.map((idx, pos) => [idx, pos]))
    ctx.memo.set(key, { ...result, placed: result.placed.map(idx => posOf.get(idx)!) })
  }
  return result
}

function searchUncached(ctx: SearchContext, panelWidth: number, panelHeight: number, list: number[], depth: number): SearchResult {
  const { pieces, kerf, priority } = ctx

  // First piece (in sort order) that fits, with its possible orientations
  let chosenPos = -1
  const orientations: Array<{ pw: number; ph: number; rotated: boolean }> = []
  for (let pos = 0; pos < list.length; pos++) {
    const piece = pieces[list[pos]]
    const allowed = ctx.orientation[list[pos]]
    if (allowed !== 'rotated' && piece.width <= panelWidth && piece.height <= panelHeight) {
      orientations.push({ pw: piece.width, ph: piece.height, rotated: false })
    }
    // Avoid duplicate orientation when width === height (unless rotation is required by grain)
    if (allowed !== 'normal' && piece.height <= panelWidth && piece.width <= panelHeight
        && (allowed === 'rotated' || piece.width !== piece.height)) {
      orientations.push({ pw: piece.height, ph: piece.width, rotated: true })
    }
    if (orientations.length > 0) {
      chosenPos = pos
      break
    }
  }
  if (chosenPos < 0) return EMPTY

  const chosen = list[chosenPos]
  const remaining = list.filter((_, pos) => pos !== chosenPos)
  const panelArea = panelWidth * panelHeight
  let best: SearchResult | null = null
  let bestScore = -Infinity
  let reach = 0

  // Fills sub-panel A, then sub-panel B with the pieces A did not use
  const fillTwo = (
    aW: number, aH: number, aX: number, aY: number,
    bW: number, bH: number, bX: number, bY: number,
    direction: 'horizontal' | 'vertical', position: number, pw: number, ph: number, rotated: boolean,
  ) => {
    const a = aW > 0 && aH > 0 ? search(ctx, aW, aH, remaining, depth + 1) : EMPTY
    const usedInA = new Set(a.placed)
    const forB = a.placed.length > 0 ? remaining.filter(i => !usedInA.has(i)) : remaining
    const b = bW > 0 && bH > 0 ? search(ctx, bW, bH, forB, depth + 1) : EMPTY
    reach = Math.max(reach, aW > 0 && aH > 0 ? a.reach + 1 : 0, bW > 0 && bH > 0 ? b.reach + 1 : 0)

    const area = pw * ph + a.area + b.area
    const placed = [chosen, ...a.placed, ...b.placed]
    const children: TreeNode['children'] = []
    if (a.tree) children.push({ node: a.tree, ox: aX, oy: aY, k: 1 })
    if (b.tree) children.push({ node: b.tree, ox: bX, oy: bY, k: 1 + a.placed.length })

    // Every cut node places one piece, so the cut count equals the piece count
    const score = scoreResult(area, panelArea, placed.length, priority)
    if (score > bestScore) {
      bestScore = score
      best = { placed, area, reach: 0, tree: { direction, position, panelWidth, panelHeight, rotated, children } }
    }
  }

  for (const { pw, ph, rotated } of orientations) {
    // At deeper levels, pick a single split heuristically to halve the branching.
    // Use horizontal-first when the remaining bottom strip is larger,
    // vertical-first when the remaining right strip is larger.
    const bottomStrip = panelWidth * (panelHeight - ph - kerf)
    const rightStrip = (panelWidth - pw - kerf) * panelHeight
    const tryBoth = depth < SPLIT_COMPARE_DEPTH
    // Horizontal-first: right strip (panelWidth - pw - kerf) × ph, then bottom strip panelWidth × (panelHeight - ph - kerf)
    if (tryBoth || bottomStrip >= rightStrip) {
      fillTwo(
        panelWidth - pw - kerf, ph, pw + kerf, 0,
        panelWidth, panelHeight - ph - kerf, 0, ph + kerf,
        'horizontal', ph, pw, ph, rotated,
      )
    }
    // Vertical-first: bottom strip pw × (panelHeight - ph - kerf), then right strip (panelWidth - pw - kerf) × panelHeight
    if (tryBoth || rightStrip > bottomStrip) {
      fillTwo(
        pw, panelHeight - ph - kerf, 0, ph + kerf,
        panelWidth - pw - kerf, panelHeight, pw + kerf, 0,
        'vertical', pw, pw, ph, rotated,
      )
    }
  }

  return { ...best!, reach }
}

// Builds Placement / CutNode objects for a search result at an absolute offset
function materialize(
  ctx: SearchContext, result: SearchResult, offsetX: number, offsetY: number,
): { placements: Placement[]; cutNode: CutNode | null } {
  const placements: Placement[] = []
  const build = (node: TreeNode, x: number, y: number, k: number): CutNode => {
    const placement: Placement = { piece: ctx.pieces[result.placed[k]], x, y, rotated: node.rotated }
    placements[k] = placement
    const children = node.children.map(c => build(c.node, x + c.ox, y + c.oy, k + c.k))
    return {
      direction: node.direction,
      position: node.position,
      panelWidth: node.panelWidth,
      panelHeight: node.panelHeight,
      piece: placement,
      children: children.length > 0 ? children : undefined,
    }
  }
  const cutNode = result.tree ? build(result.tree, offsetX, offsetY, 0) : null
  return { placements, cutNode }
}

function sortForPriority(pieces: CutPiece[], priority: OptimizationPriority): CutPiece[] {
  // For 'least-cuts', prefer tall pieces (shelf rows); otherwise area-descending
  return priority === 'least-cuts'
    ? [...pieces].sort((a, b) => b.height - a.height)
    : [...pieces].sort((a, b) => b.width * b.height - a.width * a.height)
}

function placeOnPanel(
  stock: StockPlate,
  panelWidth: number,
  panelHeight: number,
  offsetX: number,
  offsetY: number,
  pieces: CutPiece[],
  kerf: number,
  priority: OptimizationPriority,
): { placements: Placement[]; cutNode: CutNode | null } {
  const sorted = sortForPriority(pieces, priority)
  const orientation = sorted.map(p => orientationFor(p, stock))
  const codes = new Map<string, string>()
  const typeCode = sorted.map((p, i) => {
    const type = `${p.width}x${p.height}${orientation[i]}`
    if (!codes.has(type)) codes.set(type, String.fromCharCode(0x100 + codes.size))
    return codes.get(type)!
  })
  const ctx: SearchContext = { pieces: sorted, orientation, typeCode, kerf, priority, memo: new Map() }
  const result = search(ctx, panelWidth, panelHeight, sorted.map((_, i) => i), 0)
  return materialize(ctx, result, offsetX, offsetY)
}

function scoreResult(
  placedArea: number,
  panelArea: number,
  cutCount: number,
  priority: OptimizationPriority,
): number {
  const areaRatio = panelArea > 0 ? placedArea / panelArea : 0
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
  const skipped: CutPiece[] = []  // no plate (left) for these pieces
  const usable = new Map(stockPlates.map(s => [s.id, usableArea(s, kerf, trimLeft, trimTop)]))
  const fits = (piece: CutPiece, stock: StockPlate) => fitsOnStock(piece, stock, usable.get(stock.id)!)

  // Keep opening new plates until all pieces are placed or no plate fits
  while (unplacedPieces.length > 0) {
    const placeable = unplacedPieces.filter(p => stockPlates.some(s => fits(p, s)))
    if (placeable.length === 0) break

    // Pick smallest available stock that fits the largest remaining piece
    const sortedPlaceable = [...placeable].sort((a, b) => b.width * b.height - a.width * a.height)
    const largestPiece = sortedPlaceable[0]

    let bestStock: { stock: StockPlate; av: { stock: StockPlate; remaining: number } } | null = null
    for (const av of available.values()) {
      if (av.remaining <= 0) continue
      if (!fits(largestPiece, av.stock)) continue
      const area = av.stock.width * av.stock.height
      if (!bestStock || area < bestStock.stock.width * bestStock.stock.height) {
        bestStock = { stock: av.stock, av }
      }
    }

    if (!bestStock) {
      // No plate left that fits the largest piece — report it as unplaced
      skipped.push(largestPiece)
      unplacedPieces = unplacedPieces.filter(p => p !== largestPiece)
      continue
    }

    bestStock.av.remaining--
    const idx = plateIndexCounters.get(bestStock.stock.id) ?? 0
    plateIndexCounters.set(bestStock.stock.id, idx + 1)

    const { stock } = bestStock

    const area = usable.get(stock.id)!

    // Only pass pieces that actually fit this specific stock plate (thickness, material, grain, size)
    const placeableOnThisStock = placeable.filter(p => fits(p, stock))

    const result = placeOnPanel(
      stock,
      area.width,
      area.height,
      area.offsetX,
      area.offsetY,
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

  // Aggregate unplaced counts by piece id (in input order)
  const unplacedSet = new Set([...skipped, ...unplacedPieces])
  const unplacedCounts = new Map<string, { piece: CutPiece; count: number }>()
  for (const p of expanded.filter(x => unplacedSet.has(x))) {
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

  const pieceName: string | undefined = node.piece ? itemLabel(node.piece.piece) : undefined

  steps.push({
    direction: node.direction,
    position: node.position,
    context: posLabel,
    panelWidth: node.panelWidth,
    panelHeight: node.panelHeight,
    pieceName,
    pieceX: node.piece?.x,
    pieceY: node.piece?.y,
  })
  stepCounter.n++

  if (node.children) {
    for (const child of node.children) {
      traverseCutTree(child, stepCounter, steps)
    }
  } else {
    // Leaf node: the remaining area after this cut is pure waste — emit a rest step
    const restW = node.direction === 'horizontal'
      ? node.panelWidth
      : node.panelWidth - node.position
    const restH = node.direction === 'horizontal'
      ? node.panelHeight - node.position
      : node.panelHeight
    if (restW > 0 && restH > 0) {
      steps.push({
        direction: node.direction,
        position: node.position,
        context: `Schnitt ${stepCounter.n}: Rest`,
        panelWidth: node.panelWidth,
        panelHeight: node.panelHeight,
        pieceName: `Rest ${restW}×${restH} mm`,
      })
      stepCounter.n++
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
