import { describe, it, expect } from 'vitest'
import { runCompute } from './computeRequest'
import type { StockPlate, CutPiece } from '../types'

const stock: StockPlate = { id: 's', label: 'S', width: 1000, height: 500, thickness: 18, grain: 'any', quantity: 1 }
// Fits only rotated (400 wide × 900 high on a 1000 × 500 plate)
const tall: CutPiece = { id: 'p', name: 'Hoch', width: 400, height: 900, thickness: 18, quantity: 1, grain: 'horizontal' }

const base2d = { mode: '2d' as const, stockPlates: [stock], cutPieces: [tall], kerf: 3, priority: 'least-waste' as const, trimLeft: 0, trimTop: 0 }

describe('runCompute', () => {
  it('respects grain when grain is enabled', () => {
    const r = runCompute({ ...base2d, grainEnabled: true })
    expect(r.mode).toBe('2d')
    if (r.mode === '2d') expect(r.plan.unplacedPieces).toHaveLength(1)
  })

  it('ignores grain (allows rotation) when grain is disabled', () => {
    const r = runCompute({ ...base2d, grainEnabled: false })
    if (r.mode === '2d') {
      expect(r.plan.unplacedPieces).toHaveLength(0)
      expect(r.plan.plates[0].placements[0].rotated).toBe(true)
    }
  })

  it('runs the 1D algorithm in 1D mode', () => {
    const r = runCompute({
      mode: '1d',
      stockBars: [{ id: 'b', label: 'Latte', material: '', width: 0, thickness: 0, length: 3000, quantity: 1 }],
      linearParts: [{ id: 'l', name: 'Teil', material: '', width: 0, thickness: 0, length: 1000, quantity: 2 }],
      kerf: 3,
      linearTrim: 0,
    })
    expect(r.mode).toBe('1d')
    if (r.mode === '1d') expect(r.plan.bars[0].placements).toHaveLength(2)
  })

  it('returns data that survives structured cloning (worker boundary)', () => {
    const r = runCompute({ ...base2d, grainEnabled: false })
    expect(structuredClone(r)).toEqual(r)
  })
})
