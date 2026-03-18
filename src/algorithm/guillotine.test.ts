import { describe, it, expect } from 'vitest'
import { computeCutPlan, generateCutSequence } from './guillotine'
import type { StockPlate, CutPiece } from '../types'

const plate2440: StockPlate = { id: 'p1', label: 'Test', width: 2440, height: 1220, quantity: 2 }

describe('computeCutPlan', () => {
  it('places a single piece on a plate', () => {
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'A', width: 500, height: 400, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    expect(plan.plates).toHaveLength(1)
    expect(plan.plates[0].placements).toHaveLength(1)
    expect(plan.unplacedPieces).toHaveLength(0)
  })

  it('uses multiple physical plates when one is full', () => {
    // 10 pieces of 1000×600 each — one 2440×1220 plate fits ~4
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'Big', width: 1000, height: 600, quantity: 10, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    expect(plan.plates.length).toBeGreaterThan(1)
    const totalPlaced = plan.plates.reduce((s, p) => s + p.placements.length, 0)
    expect(totalPlaced).toBe(10)
  })

  it('reports unplaced piece when it exceeds all plate sizes', () => {
    const bigPiece: CutPiece[] = [
      { id: 'c1', name: 'TooBig', width: 5000, height: 5000, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], bigPiece)
    expect(plan.unplacedPieces).toHaveLength(1)
    expect(plan.plates).toHaveLength(0)
  })

  it('respects grain direction — never rotates horizontal grain', () => {
    // Piece 1200×200 with horizontal grain — fits landscape only
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'Rail', width: 1200, height: 200, quantity: 1, grain: 'horizontal' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    expect(plan.plates[0].placements[0].rotated).toBe(false)
  })

  it('waste percentage is between 0 and 100', () => {
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'A', width: 800, height: 600, quantity: 3, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    for (const plate of plan.plates) {
      expect(plate.wastePct).toBeGreaterThanOrEqual(0)
      expect(plate.wastePct).toBeLessThanOrEqual(100)
    }
  })

  it('reference test: 20 standard pieces on 3 plates ≤ 30% waste', () => {
    // 20 pieces total area ≈ 6.66M mm², plate area ≈ 2.98M mm² → minimum 3 plates needed
    // Theoretical minimum waste on 3 plates ≈ 25.4%; threshold set to 30% for algorithmic headroom
    const pieces: CutPiece[] = [
      { id: 'a', name: 'Seite',  width: 800,  height: 400, quantity: 4, grain: 'any' },
      { id: 'b', name: 'Boden',  width: 600,  height: 300, quantity: 4, grain: 'any' },
      { id: 'c', name: 'Rücken', width: 1200, height: 600, quantity: 4, grain: 'any' },
      { id: 'd', name: 'Deckel', width: 500,  height: 250, quantity: 4, grain: 'any' },
      { id: 'e', name: 'Türe',   width: 400,  height: 800, quantity: 4, grain: 'any' },
    ]
    const stock = [{ ...plate2440, quantity: 10 }]
    const plan = computeCutPlan(stock, pieces)
    expect(plan.totalWastePct).toBeLessThanOrEqual(30)
  })
})

describe('generateCutSequence', () => {
  it('returns at least one cut step for a plate with 2 placements', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, quantity: 2, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    expect(plan.plates.length).toBeGreaterThan(0)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps.length).toBeGreaterThan(0)
  })

  it('returns empty array for a plate with only one piece', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps).toHaveLength(0)
  })
})
