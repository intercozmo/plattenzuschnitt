// src/algorithm/computeRequest.ts
// Single entry point for a computation; runs inside the compute worker
import { computeCutPlan } from './guillotine'
import { computeLinearPlan } from './linear'
import { plateShortage, barShortage } from './shortage'
import type { StockPlate, CutPiece, OptimizationPriority, CutPlan, StockBar, LinearPart, LinearPlan } from '../types'

export type ComputeRequest =
  | {
      mode: '2d'
      stockPlates: StockPlate[]
      cutPieces: CutPiece[]
      kerf: number
      priority: OptimizationPriority
      grainEnabled: boolean
      trimLeft: number
      trimTop: number
    }
  | {
      mode: '1d'
      stockBars: StockBar[]
      linearParts: LinearPart[]
      kerf: number
      linearTrim: number
    }

export type ComputeResult =
  | { mode: '2d'; plan: CutPlan }
  | { mode: '1d'; plan: LinearPlan }

export function runCompute(req: ComputeRequest): ComputeResult {
  if (req.mode === '1d') {
    const plan = computeLinearPlan(req.stockBars, req.linearParts, req.kerf, req.linearTrim)
    if (plan.unplacedParts.length > 0) {
      plan.shortage = barShortage(req.stockBars, req.linearParts, req.kerf, req.linearTrim)
    }
    return { mode: '1d', plan }
  }
  // When grain is disabled, treat all pieces as freely rotatable
  const pieces = req.grainEnabled
    ? req.cutPieces
    : req.cutPieces.map(p => ({ ...p, grain: 'any' as const }))
  const plan = computeCutPlan(req.stockPlates, pieces, req.kerf, req.priority, req.trimLeft, req.trimTop)
  if (plan.unplacedPieces.length > 0) {
    plan.shortage = plateShortage(req.stockPlates, pieces, req.kerf, req.priority, req.trimLeft, req.trimTop)
  }
  return { mode: '2d', plan }
}
