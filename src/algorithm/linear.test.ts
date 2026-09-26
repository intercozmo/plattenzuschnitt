import { describe, it, expect } from 'vitest'
import { computeLinearPlan } from './linear'
import type { StockBar, LinearPart } from '../types'

const bar6000: StockBar = { id: 'b1', label: 'Latte', material: 'Fichte', width: 40, thickness: 60, length: 6000, quantity: 5 }
const part = (id: string, length: number, quantity = 1, section: Partial<LinearPart> = {}): LinearPart =>
  ({ id, name: id, material: 'Fichte', width: 40, thickness: 60, length, quantity, ...section })

describe('computeLinearPlan', () => {
  it('places parts that exactly fill a bar without trailing cut', () => {
    const plan = computeLinearPlan([bar6000], [part('a', 3000, 2)], 0)
    expect(plan.bars).toHaveLength(1)
    expect(plan.bars[0].placements.map(p => p.offset)).toEqual([0, 3000])
    expect(plan.bars[0].wasteLength).toBe(0)
    expect(plan.bars[0].cuts).toBe(1)
  })

  it('accounts for kerf between parts', () => {
    // 2 × 3000 + 3 kerf > 6000 → second part needs a new bar
    const plan = computeLinearPlan([bar6000], [part('a', 3000, 2)], 3)
    expect(plan.bars).toHaveLength(2)
    const plan2 = computeLinearPlan([bar6000], [part('a', 2998, 2)], 3)
    expect(plan2.bars).toHaveLength(1)
    expect(plan2.bars[0].placements.map(p => p.offset)).toEqual([0, 3001])
  })

  it('uses best fit to fill gaps with smaller parts', () => {
    // 4000+2000 and 3500+2500 fill two bars exactly
    const plan = computeLinearPlan([bar6000], [part('a', 4000), part('b', 3500), part('c', 2000), part('d', 2500)], 0)
    expect(plan.bars).toHaveLength(2)
    expect(plan.totalWastePct).toBe(0)
  })

  it('only combines parts and bars with the same cross-section', () => {
    const other = { width: 20, thickness: 40 }
    const plan = computeLinearPlan([bar6000], [part('a', 1000), part('b', 1000, 1, other)], 0)
    expect(plan.bars).toHaveLength(1)
    expect(plan.unplacedParts).toEqual([part('b', 1000, 1, other)])
  })

  it('only combines parts and bars of the same material (case-insensitive)', () => {
    const plan = computeLinearPlan([bar6000], [part('a', 1000, 1, { material: ' fichte ' }), part('b', 1000, 1, { material: 'Accoya' })], 0)
    expect(plan.bars[0].placements.map(p => p.part.id)).toEqual(['a'])
    expect(plan.unplacedParts.map(p => p.id)).toEqual(['b'])
  })

  it('treats unspecified cross-section and material as matching anything', () => {
    const plan = computeLinearPlan([bar6000], [part('a', 1000, 1, { width: 0, thickness: 0, material: '' })], 0)
    expect(plan.unplacedParts).toEqual([])
  })

  it('reports parts longer than every bar as unplaced', () => {
    const plan = computeLinearPlan([bar6000], [part('a', 7000, 2)], 0)
    expect(plan.bars).toHaveLength(0)
    expect(plan.unplacedParts).toEqual([part('a', 7000, 2)])
  })

  it('respects stock quantity and reports unused stock', () => {
    const plan = computeLinearPlan([{ ...bar6000, quantity: 1 }], [part('a', 4000, 2)], 0)
    expect(plan.bars).toHaveLength(1)
    expect(plan.unplacedParts[0].quantity).toBe(1)
    const plan2 = computeLinearPlan([bar6000], [part('a', 4000)], 0)
    expect(plan2.unusedStock).toEqual([{ stock: bar6000, quantity: 4 }])
  })

  it('opens the shortest bar that fits', () => {
    const short: StockBar = { ...bar6000, id: 'b2', length: 2500 }
    const plan = computeLinearPlan([bar6000, short], [part('a', 2000)], 0)
    expect(plan.bars[0].stock.id).toBe('b2')
    expect(plan.bars[0].wastePct).toBeCloseTo(20)
  })

  it('starts after the trim plus kerf and counts the trim cut', () => {
    const plan = computeLinearPlan([bar6000], [part('a', 1000)], 3, 10)
    expect(plan.bars[0].placements[0].offset).toBe(13)
    expect(plan.bars[0].cuts).toBe(2)
    expect(plan.bars[0].wasteLength).toBe(5000)
  })
})
