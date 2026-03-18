// src/algorithm/guillotine.ts
import { DEFAULT_KERF_MM } from '../constants'
import type { StockPlate, CutPiece, Placement, PlacedPlate, CutPlan, CutStep } from '../types'

interface FreeRect {
  x: number
  y: number
  width: number
  height: number
}

interface OpenPlate {
  stock: StockPlate
  plateIndex: number
  freeRects: FreeRect[]
  placements: Placement[]
  kerfArea: number
}

function bssfScore(rect: FreeRect, pw: number, ph: number): number {
  if (pw > rect.width || ph > rect.height) return Infinity
  return Math.min(rect.width - pw, rect.height - ph)
}

function splitRect(rect: FreeRect, pw: number, ph: number, kerf: number): FreeRect[] {
  const right = rect.width - pw
  const bottom = rect.height - ph
  const result: FreeRect[] = []

  if (right >= bottom) {
    // Vertical cut
    if (right - kerf > 0) {
      result.push({ x: rect.x + pw + kerf, y: rect.y, width: right - kerf, height: ph })
    }
    if (bottom - kerf > 0) {
      result.push({ x: rect.x, y: rect.y + ph + kerf, width: rect.width, height: bottom - kerf })
    }
  } else {
    // Horizontal cut
    if (bottom - kerf > 0) {
      result.push({ x: rect.x, y: rect.y + ph + kerf, width: rect.width, height: bottom - kerf })
    }
    if (rect.width - pw - kerf > 0) {
      result.push({ x: rect.x + pw + kerf, y: rect.y, width: rect.width - pw - kerf, height: ph })
    }
  }
  return result
}

function canRotate(piece: CutPiece): boolean {
  return piece.grain === 'any'
}

function fitsOnStock(piece: CutPiece, stock: StockPlate): boolean {
  if (piece.width <= stock.width && piece.height <= stock.height) return true
  if (canRotate(piece) && piece.height <= stock.width && piece.width <= stock.height) return true
  return false
}

function findBestFitOnPlates(
  openPlates: OpenPlate[],
  piece: CutPiece
): { plate: OpenPlate; rectIdx: number; pw: number; ph: number; rotated: boolean; score: number } | null {
  let best: { plate: OpenPlate; rectIdx: number; pw: number; ph: number; rotated: boolean; score: number } | null = null

  const orientations: Array<{ pw: number; ph: number; rotated: boolean }> = [
    { pw: piece.width, ph: piece.height, rotated: false },
  ]
  if (canRotate(piece)) {
    orientations.push({ pw: piece.height, ph: piece.width, rotated: true })
  }

  for (const op of openPlates) {
    for (let ri = 0; ri < op.freeRects.length; ri++) {
      const rect = op.freeRects[ri]
      for (const { pw, ph, rotated } of orientations) {
        const score = bssfScore(rect, pw, ph)
        if (score < (best?.score ?? Infinity)) {
          best = { plate: op, rectIdx: ri, pw, ph, rotated, score }
        }
      }
    }
  }

  return best
}

function placePieceOnPlate(op: OpenPlate, piece: CutPiece, rectIdx: number, pw: number, ph: number, rotated: boolean, kerf: number): void {
  const rect = op.freeRects[rectIdx]
  const placement: Placement = { piece, x: rect.x, y: rect.y, rotated }
  op.placements.push(placement)

  const newRects = splitRect(rect, pw, ph, kerf)
  op.freeRects.splice(rectIdx, 1, ...newRects)

  // Accumulate kerf area
  const right = rect.width - pw
  const bottom = rect.height - ph
  if (right > 0) op.kerfArea += kerf * ph
  if (bottom > 0) op.kerfArea += kerf * rect.width
}

export function computeCutPlan(
  stockPlates: StockPlate[],
  cutPieces: CutPiece[],
  kerf = DEFAULT_KERF_MM
): CutPlan {
  // Expand by quantity, sort largest first
  const expanded: CutPiece[] = []
  for (const piece of cutPieces) {
    for (let i = 0; i < piece.quantity; i++) expanded.push(piece)
  }
  expanded.sort((a, b) => b.width * b.height - a.width * a.height)

  // Track available physical plate counts
  const available = new Map<string, { stock: StockPlate; remaining: number }>()
  for (const s of stockPlates) {
    available.set(s.id, { stock: s, remaining: s.quantity })
  }

  const openPlates: OpenPlate[] = []
  const plateIndexCounters = new Map<string, number>()
  const unplacedCounts = new Map<string, { piece: CutPiece; count: number }>()

  for (const piece of expanded) {
    // Check if piece can fit on any stock at all
    if (!stockPlates.some(s => fitsOnStock(piece, s))) {
      const existing = unplacedCounts.get(piece.id)
      if (existing) {
        existing.count++
      } else {
        unplacedCounts.set(piece.id, { piece, count: 1 })
      }
      continue
    }

    // Try open plates first
    const fit = findBestFitOnPlates(openPlates, piece)
    if (fit) {
      placePieceOnPlate(fit.plate, piece, fit.rectIdx, fit.pw, fit.ph, fit.rotated, kerf)
      continue
    }

    // Open a new plate — pick smallest available stock that fits
    let bestStock: { stock: StockPlate; av: { stock: StockPlate; remaining: number } } | null = null
    for (const av of available.values()) {
      if (av.remaining <= 0) continue
      if (!fitsOnStock(piece, av.stock)) continue
      const area = av.stock.width * av.stock.height
      if (!bestStock || area < bestStock.stock.width * bestStock.stock.height) {
        bestStock = { stock: av.stock, av }
      }
    }

    if (!bestStock) {
      const existing = unplacedCounts.get(piece.id)
      if (existing) {
        existing.count++
      } else {
        unplacedCounts.set(piece.id, { piece, count: 1 })
      }
      continue
    }

    bestStock.av.remaining--
    const idx = plateIndexCounters.get(bestStock.stock.id) ?? 0
    plateIndexCounters.set(bestStock.stock.id, idx + 1)

    const op: OpenPlate = {
      stock: bestStock.stock,
      plateIndex: idx,
      freeRects: [{ x: 0, y: 0, width: bestStock.stock.width, height: bestStock.stock.height }],
      placements: [],
      kerfArea: 0,
    }
    openPlates.push(op)

    // Place on fresh plate
    const orientations: Array<{ pw: number; ph: number; rotated: boolean }> = [
      { pw: piece.width, ph: piece.height, rotated: false },
    ]
    if (canRotate(piece)) orientations.push({ pw: piece.height, ph: piece.width, rotated: true })

    for (const { pw, ph, rotated } of orientations) {
      if (bssfScore(op.freeRects[0], pw, ph) < Infinity) {
        placePieceOnPlate(op, piece, 0, pw, ph, rotated, kerf)
        break
      }
    }
  }

  // Build result
  const plates: PlacedPlate[] = openPlates.map(op => {
    const totalArea = op.stock.width * op.stock.height
    const placedArea = op.placements.reduce((sum, p) => {
      const pw = p.rotated ? p.piece.height : p.piece.width
      const ph = p.rotated ? p.piece.width : p.piece.height
      return sum + pw * ph
    }, 0)
    const wasteArea = Math.max(0, totalArea - placedArea - op.kerfArea)
    const wastePct = (wasteArea / totalArea) * 100
    return { stock: op.stock, plateIndex: op.plateIndex, placements: op.placements, wasteArea, wastePct }
  })

  const totalWasteArea = plates.reduce((s, p) => s + p.wasteArea, 0)
  const totalPlateArea = plates.reduce((s, p) => s + p.stock.width * p.stock.height, 0)
  const totalWastePct = totalPlateArea > 0 ? (totalWasteArea / totalPlateArea) * 100 : 0

  const unusedStockPlates = Array.from(available.values())
    .filter(({ remaining }) => remaining > 0)
    .map(({ stock, remaining }) => ({ stock, quantity: remaining }))

  const unplacedPieces: CutPiece[] = Array.from(unplacedCounts.values()).map(({ piece, count }) => ({
    ...piece,
    quantity: count,
  }))

  return { plates, totalWastePct, unusedStockPlates, unplacedPieces }
}

export function generateCutSequence(plate: PlacedPlate, kerf = DEFAULT_KERF_MM): CutStep[] {
  if (plate.placements.length <= 1) return []

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
