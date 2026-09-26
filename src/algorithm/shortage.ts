// src/algorithm/shortage.ts
// When not everything could be placed: which stock is missing, and how much.
// Re-plans with unlimited stock; the greedy plate choice then shows how many
// of each stock type are needed. With at least that many of each type the
// limited plan makes the same choices and places everything.
import { computeCutPlan } from './guillotine'
import { computeLinearPlan } from './linear'
import type { StockPlate, CutPiece, StockBar, LinearPart, OptimizationPriority, Shortage } from '../types'

function needs<S extends { id: string; quantity: number }>(stock: S[], usedIds: string[]) {
  return stock
    .map(s => {
      const needed = usedIds.filter(id => id === s.id).length
      return { stock: s, available: s.quantity, needed, missing: Math.max(0, needed - s.quantity) }
    })
    .filter(n => n.missing > 0)
}

export function plateShortage(
  stockPlates: StockPlate[], pieces: CutPiece[], kerf: number,
  priority: OptimizationPriority, trimLeft: number, trimTop: number,
): Shortage<StockPlate, CutPiece> {
  const total = pieces.reduce((s, p) => s + p.quantity, 0)
  const unlimited = stockPlates.map(s => ({ ...s, quantity: total }))
  const plan = computeCutPlan(unlimited, pieces, kerf, priority, trimLeft, trimTop)
  return {
    missing: needs(stockPlates, plan.plates.map(p => p.stock.id)),
    unfittable: plan.unplacedPieces,
  }
}

export function barShortage(
  stockBars: StockBar[], parts: LinearPart[], kerf: number, trimStart: number,
): Shortage<StockBar, LinearPart> {
  const total = parts.reduce((s, p) => s + p.quantity, 0)
  const unlimited = stockBars.map(s => ({ ...s, quantity: total }))
  const plan = computeLinearPlan(unlimited, parts, kerf, trimStart)
  return {
    missing: needs(stockBars, plan.bars.map(b => b.stock.id)),
    unfittable: plan.unplacedParts,
  }
}
