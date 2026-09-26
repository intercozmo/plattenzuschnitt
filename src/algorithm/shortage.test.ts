import { describe, it, expect } from 'vitest'
import { computeCutPlan } from './guillotine'
import { plateShortage, barShortage } from './shortage'
import { runCompute } from './computeRequest'
import type { StockPlate, CutPiece, StockBar, LinearPart } from '../types'

const plate = (e: Partial<StockPlate> = {}): StockPlate =>
  ({ id: 's', label: 'Span', width: 2070, height: 2800, thickness: 18, grain: 'any', quantity: 1, ...e })
const piece = (id: string, w: number, h: number, quantity: number, e: Partial<CutPiece> = {}): CutPiece =>
  ({ id, name: id, width: w, height: h, thickness: 18, quantity, grain: 'any', ...e })
const bar = (e: Partial<StockBar> = {}): StockBar =>
  ({ id: 'b', label: 'Latte', material: '', width: 0, thickness: 0, length: 3000, quantity: 1, ...e })
const part = (id: string, length: number, quantity: number): LinearPart =>
  ({ id, name: id, material: '', width: 0, thickness: 0, length, quantity })

describe('running out of stock', () => {
  it('reports every piece that could not be placed', () => {
    // 3 pieces of 1000×1400 fit on one 2070×2800 plate; 8 are needed
    const plan = computeCutPlan([plate()], [piece('a', 1000, 1400, 8)], 3)
    const placed = plan.plates.reduce((s, p) => s + p.placements.length, 0)
    expect(placed + plan.unplacedPieces.reduce((s, p) => s + p.quantity, 0)).toBe(8)
    expect(plan.unplacedPieces).toEqual([expect.objectContaining({ id: 'a', quantity: 5 })])
  })

  it('counts the missing plates per stock type', () => {
    const shortage = plateShortage([plate({ quantity: 1 })], [piece('a', 1000, 1400, 8)], 3, 'least-waste', 0, 0)
    expect(shortage.missing).toEqual([expect.objectContaining({ available: 1, needed: 3, missing: 2 })])
    expect(shortage.unfittable).toEqual([])
  })

  it('lists pieces that fit no stock type at all', () => {
    const shortage = plateShortage([plate()], [piece('big', 2500, 3000, 1), piece('thick', 100, 100, 2, { thickness: 40 })], 3, 'least-waste', 0, 0)
    expect(shortage.missing).toEqual([])
    expect(shortage.unfittable.map(p => [p.id, p.quantity])).toEqual([['big', 1], ['thick', 2]])
  })

  it('placing the missing plates too places everything', () => {
    const stock = [plate({ id: 'a', quantity: 1 }), plate({ id: 'b', width: 1220, height: 2440, quantity: 1 })]
    const pieces = [piece('x', 1000, 1400, 6), piece('y', 600, 1100, 5)]
    const shortage = plateShortage(stock, pieces, 3, 'balanced', 0, 0)
    const topped = stock.map(s => ({ ...s, quantity: s.quantity + (shortage.missing.find(m => m.stock.id === s.id)?.missing ?? 0) }))
    expect(computeCutPlan(topped, pieces, 3, 'balanced').unplacedPieces).toEqual([])
  })

  it('counts the missing bars', () => {
    // 2 parts of 1000 per 3000 bar with 3 mm kerf; 5 parts → 3 bars
    const shortage = barShortage([bar()], [part('x', 1000, 5)], 3, 0)
    expect(shortage.missing).toEqual([expect.objectContaining({ available: 1, needed: 3, missing: 2 })])
  })

  it('is attached to the plan only when something is missing', () => {
    const base = { mode: '2d' as const, kerf: 3, priority: 'least-waste' as const, grainEnabled: false, trimLeft: 0, trimTop: 0 }
    const short = runCompute({ ...base, stockPlates: [plate()], cutPieces: [piece('a', 1000, 1400, 8)] })
    const enough = runCompute({ ...base, stockPlates: [plate({ quantity: 5 })], cutPieces: [piece('a', 1000, 1400, 8)] })
    expect(short.mode === '2d' && short.plan.shortage?.missing[0].missing).toBe(2)
    expect(enough.mode === '2d' && enough.plan.shortage).toBeUndefined()
    const linear = runCompute({ mode: '1d', stockBars: [bar()], linearParts: [part('x', 1000, 5)], kerf: 3, linearTrim: 0 })
    expect(linear.mode === '1d' && linear.plan.shortage?.missing[0].missing).toBe(2)
  })
})

describe('trim when choosing a plate', () => {
  it('uses a longer plate when the trim makes the shorter one too short', () => {
    // 2790 fits 2800 but not 2800 − 10 trim − 3 kerf = 2787
    const stock = [plate({ id: 'short' }), plate({ id: 'long', height: 3000 })]
    const plan = computeCutPlan(stock, [piece('p', 2070, 2790, 1)], 3, 'least-waste', 10, 0)
    expect(plan.unplacedPieces).toEqual([])
    expect(plan.plates[0].stock.id).toBe('long')
  })
})
