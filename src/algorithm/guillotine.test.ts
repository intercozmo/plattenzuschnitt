import { describe, it, expect } from 'vitest'
import { computeCutPlan, generateCutSequence } from './guillotine'
import type { StockPlate, CutPiece, CutNode } from '../types'

const plate2440: StockPlate = { id: 'p1', label: 'Test', width: 2440, height: 1220, thickness: 18, grain: 'any', quantity: 2 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectNodes(node: CutNode): CutNode[] {
  const nodes: CutNode[] = [node]
  if (node.children) {
    for (const child of node.children) nodes.push(...collectNodes(child))
  }
  return nodes
}

// ---------------------------------------------------------------------------
// computeCutPlan — existing tests (adjusted for new API)
// ---------------------------------------------------------------------------

describe('computeCutPlan', () => {
  it('places a single piece on a plate', () => {
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'A', width: 500, height: 400, thickness: 18, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    expect(plan.plates).toHaveLength(1)
    expect(plan.plates[0].placements).toHaveLength(1)
    expect(plan.unplacedPieces).toHaveLength(0)
  })

  it('uses multiple physical plates when one is full', () => {
    // 10 pieces of 1000×600 each — one 2440×1220 plate fits ~4
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'Big', width: 1000, height: 600, thickness: 18, quantity: 10, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    expect(plan.plates.length).toBeGreaterThan(1)
    const totalPlaced = plan.plates.reduce((s, p) => s + p.placements.length, 0)
    expect(totalPlaced).toBe(10)
  })

  it('reports unplaced piece when it exceeds all plate sizes', () => {
    const bigPiece: CutPiece[] = [
      { id: 'c1', name: 'TooBig', width: 5000, height: 5000, thickness: 18, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], bigPiece)
    expect(plan.unplacedPieces).toHaveLength(1)
    expect(plan.plates).toHaveLength(0)
  })

  it('respects grain direction — never rotates horizontal grain', () => {
    // Piece 1200×200 with horizontal grain — fits landscape only
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'Rail', width: 1200, height: 200, thickness: 18, quantity: 1, grain: 'horizontal' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    expect(plan.plates[0].placements[0].rotated).toBe(false)
  })

  it('waste percentage is between 0 and 100', () => {
    const pieces: CutPiece[] = [
      { id: 'c1', name: 'A', width: 800, height: 600, thickness: 18, quantity: 3, grain: 'any' }
    ]
    const plan = computeCutPlan([plate2440], pieces)
    for (const plate of plan.plates) {
      expect(plate.wastePct).toBeGreaterThanOrEqual(0)
      expect(plate.wastePct).toBeLessThanOrEqual(100)
    }
  })

  it('reference test: 20 standard pieces on 3 plates ≤ 30% waste', () => {
    // 20 pieces total area ≈ 6.66M mm², plate area ≈ 2.98M mm² → minimum 3 plates needed
    const pieces: CutPiece[] = [
      { id: 'a', name: 'Seite',  width: 800,  height: 400, thickness: 18, quantity: 4, grain: 'any' },
      { id: 'b', name: 'Boden',  width: 600,  height: 300, thickness: 18, quantity: 4, grain: 'any' },
      { id: 'c', name: 'Rücken', width: 1200, height: 600, thickness: 18, quantity: 4, grain: 'any' },
      { id: 'd', name: 'Deckel', width: 500,  height: 250, thickness: 18, quantity: 4, grain: 'any' },
      { id: 'e', name: 'Türe',   width: 400,  height: 800, thickness: 18, quantity: 4, grain: 'any' },
    ]
    const stock = [{ ...plate2440, quantity: 10 }]
    const plan = computeCutPlan(stock, pieces)
    expect(plan.totalWastePct).toBeLessThanOrEqual(30)
  })

  // -------------------------------------------------------------------------
  // New: cut tree structural tests
  // -------------------------------------------------------------------------

  it('produces a cutTree for each placed plate', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 2, grain: 'any' },
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 1 }], pieces)
    expect(plan.plates.length).toBeGreaterThan(0)
    // Each plate that has pieces placed should have a cutTree
    for (const plate of plan.plates) {
      expect(plate.cutTree).toBeDefined()
    }
    expect(plan.cutTrees).toBeDefined()
    expect(plan.cutTrees!.length).toBe(plan.plates.length)
  })

  it('every cut in the cut tree spans the full width or height of its panel', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 3, grain: 'any' },
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 2 }], pieces)

    for (const plate of plan.plates) {
      if (!plate.cutTree) continue
      const nodes = collectNodes(plate.cutTree)
      for (const node of nodes) {
        if (node.direction === 'horizontal') {
          // A horizontal cut at `position` must be within the panel height
          expect(node.position).toBeGreaterThan(0)
          expect(node.position).toBeLessThanOrEqual(node.panelHeight)
        } else {
          // A vertical cut at `position` must be within the panel width
          expect(node.position).toBeGreaterThan(0)
          expect(node.position).toBeLessThanOrEqual(node.panelWidth)
        }
      }
    }
  })

  it('cut tree nodes reference correct panel dimensions', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 500, height: 300, thickness: 18, quantity: 2, grain: 'any' },
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 1 }], pieces)
    const plate = plan.plates[0]
    if (!plate.cutTree) return

    // Root node must match the full plate dimensions
    expect(plate.cutTree.panelWidth).toBe(plate2440.width)
    expect(plate.cutTree.panelHeight).toBe(plate2440.height)
  })

  // -------------------------------------------------------------------------
  // New: optimization priority tests
  // -------------------------------------------------------------------------

  it('accepts priority parameter without error', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 4, grain: 'any' },
    ]
    const stock = [{ ...plate2440, quantity: 3 }]
    expect(() => computeCutPlan(stock, pieces, 3, 'least-waste')).not.toThrow()
    expect(() => computeCutPlan(stock, pieces, 3, 'least-cuts')).not.toThrow()
    expect(() => computeCutPlan(stock, pieces, 3, 'balanced')).not.toThrow()
  })

  it("'least-cuts' priority produces ≤ cut nodes than 'least-waste' on a simple case", () => {
    // Several same-height pieces encourage shelf rows under least-cuts
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 400, height: 300, thickness: 18, quantity: 6, grain: 'any' },
    ]
    const stock = [{ ...plate2440, quantity: 5 }]

    const planWaste = computeCutPlan(stock, pieces, 3, 'least-waste')
    const planCuts  = computeCutPlan(stock, pieces, 3, 'least-cuts')

    const countAllNodes = (plates: typeof planWaste.plates) =>
      plates.reduce((sum, p) => sum + (p.cutTree ? collectNodes(p.cutTree).length : 0), 0)

    const nodesWaste = countAllNodes(planWaste.plates)
    const nodesCuts  = countAllNodes(planCuts.plates)

    // least-cuts should produce strictly fewer or equal cut nodes than least-waste
    expect(nodesCuts).toBeLessThanOrEqual(nodesWaste)
  })

  // -------------------------------------------------------------------------
  // New: grain direction / rotation tests
  // -------------------------------------------------------------------------

  it('rotation follows the plate grain', () => {
    // Piece 200×1300 on a 2440×1220 plate: 1300 > 1220, so it only fits rotated.
    const piece = (grain: CutPiece['grain']): CutPiece =>
      ({ id: 'r', name: 'NeedsRot', width: 200, height: 1300, thickness: 18, quantity: 1, grain })
    const onPlate = (plateGrain: StockPlate['grain'], pieceGrain: CutPiece['grain']) =>
      computeCutPlan([{ ...plate2440, quantity: 1, grain: plateGrain }], [piece(pieceGrain)])

    // No grain on piece or plate: rotation allowed
    expect(onPlate('any', 'any').plates[0]?.placements[0]?.rotated).toBe(true)
    expect(onPlate('any', 'horizontal').plates[0]?.placements[0]?.rotated).toBe(true)
    expect(onPlate('vertical', 'any').plates[0]?.placements[0]?.rotated).toBe(true)
    // Plate längs, piece quer → must be rotated → fits
    expect(onPlate('horizontal', 'vertical').plates[0]?.placements[0]?.rotated).toBe(true)
    // Same grain direction → must not be rotated → does not fit
    const same = onPlate('horizontal', 'horizontal')
    expect(same.plates).toHaveLength(0)
    expect(same.unplacedPieces).toHaveLength(1)
  })

  it('aligns every grained piece with the plate grain', () => {
    // Pieces that fit either way: orientation must follow the grain rule exactly
    const pieces: CutPiece[] = [
      { id: 'l', name: 'Längs', width: 300, height: 600, thickness: 18, quantity: 3, grain: 'horizontal' },
      { id: 'q', name: 'Quer', width: 300, height: 600, thickness: 18, quantity: 3, grain: 'vertical' },
    ]
    for (const plateGrain of ['horizontal', 'vertical'] as const) {
      const plan = computeCutPlan([{ ...plate2440, grain: plateGrain }], pieces)
      const placements = plan.plates.flatMap(p => p.placements)
      expect(placements).toHaveLength(6)
      for (const p of placements) expect(p.rotated).toBe(p.piece.grain !== plateGrain)
    }
  })

  it('thickness mismatch: piece is not placed on wrong-thickness plate', () => {
    // Stock plate: 18mm, piece: 10mm → must NOT be placed
    const stock: StockPlate[] = [{ ...plate2440, thickness: 18, quantity: 5 }]
    const pieces: CutPiece[] = [
      { id: 'thin', name: 'Thin', width: 400, height: 300, thickness: 10, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan(stock, pieces)
    expect(plan.unplacedPieces).toHaveLength(1)
    expect(plan.plates).toHaveLength(0)
  })

  it('thickness match: pieces are correctly separated onto matching plates', () => {
    // Two stock plates: 16mm and 10mm; pieces of each thickness must land on matching plate
    const stock16: StockPlate = { id: 's16', label: '16mm', width: 2440, height: 1220, thickness: 16, grain: 'any', quantity: 2 }
    const stock10: StockPlate = { id: 's10', label: '10mm', width: 2440, height: 1220, thickness: 10, grain: 'any', quantity: 2 }
    const pieces: CutPiece[] = [
      { id: 'a', name: 'Blende',    width: 150, height: 1600, thickness: 16, quantity: 1, grain: 'any' },
      { id: 'b', name: 'Untersicht', width: 400, height: 1600, thickness: 10, quantity: 1, grain: 'any' },
    ]
    const plan = computeCutPlan([stock16, stock10], pieces)
    expect(plan.unplacedPieces).toHaveLength(0)
    for (const plate of plan.plates) {
      for (const placement of plate.placements) {
        expect(placement.piece.thickness).toBe(plate.stock.thickness)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// generateCutSequence
// ---------------------------------------------------------------------------

describe('generateCutSequence', () => {
  it('returns at least one cut step for a plate with 2 placements', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 2, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    expect(plan.plates.length).toBeGreaterThan(0)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps.length).toBeGreaterThan(0)
  })

  it('returns empty array for a plate with only one piece', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 1, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 5 }], pieces)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps).toHaveLength(0)
  })

  it('cut sequence steps have correct direction and positive position', () => {
    const pieces: CutPiece[] = [
      { id: 'a', name: 'A', width: 600, height: 400, thickness: 18, quantity: 3, grain: 'any' }
    ]
    const plan = computeCutPlan([{ ...plate2440, quantity: 2 }], pieces)
    for (const plate of plan.plates) {
      const steps = generateCutSequence(plate)
      for (const step of steps) {
        expect(['horizontal', 'vertical']).toContain(step.direction)
        expect(step.position).toBeGreaterThan(0)
        expect(step.context).toMatch(/Schnitt \d+/)
      }
    }
  })

  it('generateCutSequence includes rest dimensions in pieceName', () => {
    const stocks: StockPlate[] = [
      { id: 's1', label: '', width: 1000, height: 500, thickness: 18, grain: 'any', quantity: 1 },
    ]
    const pieces: CutPiece[] = [
      { id: 'p1', name: 'A', width: 300, height: 200, thickness: 18, quantity: 1, grain: 'any' },
      { id: 'p2', name: 'B', width: 200, height: 150, thickness: 18, quantity: 1, grain: 'any' },
    ]
    const plan = computeCutPlan(stocks, pieces, 3)
    expect(plan.plates.length).toBe(1)
    expect(plan.plates[0].placements.length).toBe(2)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps.length).toBeGreaterThan(0)
    // At least one step should have a pieceName starting with "Rest"
    const restSteps = steps.filter(s => s.pieceName?.startsWith('Rest'))
    expect(restSteps.length).toBeGreaterThan(0)
    // Rest label should contain dimensions in the format "Rest WxH mm"
    for (const step of restSteps) {
      expect(step.pieceName).toMatch(/^Rest \d+×\d+ mm$/)
    }
  })
})

describe('material matching', () => {
  const plate = (id: string, material: string): StockPlate =>
    ({ id, label: id, material, width: 2440, height: 1220, thickness: 18, grain: 'any', quantity: 1 })
  const piece = (id: string, material: string): CutPiece =>
    ({ id, name: id, material, width: 500, height: 400, thickness: 18, quantity: 1, grain: 'any' })

  it('places pieces only on plates of the same material', () => {
    const plan = computeCutPlan([plate('eiche', 'Eiche')], [piece('a', 'eiche'), piece('b', 'Buche')], 3)
    expect(plan.plates[0].placements.map(p => p.piece.id)).toEqual(['a'])
    expect(plan.unplacedPieces.map(p => p.id)).toEqual(['b'])
  })

  it('lets pieces or plates without material match anything', () => {
    const plan = computeCutPlan([plate('any', '')], [piece('a', 'Buche'), piece('b', '')], 3)
    expect(plan.unplacedPieces).toEqual([])
  })

  it('shows the position number in the cut sequence', () => {
    const plan = computeCutPlan([plate('p', '')], [{ ...piece('a', ''), pos: '7', name: 'Boden' }, piece('b', '')], 3)
    const steps = generateCutSequence(plan.plates[0])
    expect(steps.some(s => s.pieceName === '7 Boden')).toBe(true)
  })
})

describe('performance', () => {
  // ~500 pieces took up to a minute before the search was memoized (now well under 2 s)
  it('plans close to MAX_TOTAL_PIECES pieces in a few seconds', () => {
    const sizes = [[720, 560], [800, 500], [400, 300], [600, 350], [1200, 450], [330, 250], [900, 600], [150, 700]]
    const pieces: CutPiece[] = sizes.map(([h, w], i) => ({ id: 'p' + i, name: 'P' + i, width: w, height: h, thickness: 18, quantity: 62, grain: 'any' }))
    const stock: StockPlate[] = [{ id: 's', label: 'S', width: 2070, height: 2800, thickness: 18, grain: 'any', quantity: 200 }]
    const start = performance.now()
    const plan = computeCutPlan(stock, pieces, 3, 'balanced')
    expect(performance.now() - start).toBeLessThan(15000)
    expect(plan.unplacedPieces).toEqual([])
    expect(plan.plates).toHaveLength(28)
  }, 30000)
})
