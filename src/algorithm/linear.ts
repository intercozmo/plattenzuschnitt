// src/algorithm/linear.ts
// 1D cutting: Best-Fit-Decreasing over bars of matching cross-section and material
import { DEFAULT_KERF_MM } from '../constants'
import { materialMatches, dimensionMatches } from '../utils/items'
import type { StockBar, LinearPart, LinearPlacement, PlacedBar, LinearPlan } from '../types'

interface OpenBar {
  stock: StockBar
  barIndex: number
  placements: LinearPlacement[]
  next: number  // offset where the next part would start
}

function fitsBar(part: LinearPart, bar: StockBar): boolean {
  return dimensionMatches(part.width, bar.width)
    && dimensionMatches(part.thickness, bar.thickness)
    && materialMatches(part.material, bar.material)
}

export function computeLinearPlan(
  stockBars: StockBar[],
  parts: LinearPart[],
  kerf = DEFAULT_KERF_MM,
  trimStart = 0,
): LinearPlan {
  // Same convention as the 2D trim: trim strip plus one kerf
  const startOffset = trimStart > 0 ? trimStart + kerf : 0

  // Expand by quantity, longest first
  const expanded: LinearPart[] = []
  for (const part of parts) {
    for (let i = 0; i < part.quantity; i++) expanded.push({ ...part, quantity: 1 })
  }
  expanded.sort((a, b) => b.length - a.length)

  const remaining = new Map<string, number>(stockBars.map(s => [s.id, s.quantity]))
  const barIndexCounters = new Map<string, number>()
  const open: OpenBar[] = []
  const unplaced: LinearPart[] = []

  for (const part of expanded) {
    // Best fit: open bar with the least space left after placing the part
    let best: OpenBar | null = null
    for (const bar of open) {
      if (!fitsBar(part, bar.stock)) continue
      if (bar.next + part.length > bar.stock.length) continue
      if (!best || bar.stock.length - bar.next < best.stock.length - best.next) best = bar
    }

    if (!best) {
      // Open the shortest available bar that fits
      let stock: StockBar | null = null
      for (const s of stockBars) {
        if ((remaining.get(s.id) ?? 0) <= 0) continue
        if (!fitsBar(part, s)) continue
        if (startOffset + part.length > s.length) continue
        if (!stock || s.length < stock.length) stock = s
      }
      if (!stock) {
        unplaced.push(part)
        continue
      }
      remaining.set(stock.id, (remaining.get(stock.id) ?? 0) - 1)
      const barIndex = barIndexCounters.get(stock.id) ?? 0
      barIndexCounters.set(stock.id, barIndex + 1)
      best = { stock, barIndex, placements: [], next: startOffset }
      open.push(best)
    }

    best.placements.push({ part, offset: best.next })
    best.next += part.length + kerf
  }

  const bars: PlacedBar[] = open.map(bar => {
    const used = bar.placements.reduce((s, p) => s + p.part.length, 0)
    const wasteLength = bar.stock.length - used
    const last = bar.placements[bar.placements.length - 1]
    const endsAtBarEnd = last.offset + last.part.length >= bar.stock.length
    return {
      stock: bar.stock,
      barIndex: bar.barIndex,
      placements: bar.placements,
      wasteLength,
      wastePct: (wasteLength / bar.stock.length) * 100,
      cuts: (startOffset > 0 ? 1 : 0) + bar.placements.length - (endsAtBarEnd ? 1 : 0),
    }
  })

  // Aggregate unplaced counts by part id
  const unplacedCounts = new Map<string, LinearPart>()
  for (const p of unplaced) {
    const existing = unplacedCounts.get(p.id)
    if (existing) existing.quantity++
    else unplacedCounts.set(p.id, { ...p, quantity: 1 })
  }

  const totalLength = bars.reduce((s, b) => s + b.stock.length, 0)
  const totalWaste = bars.reduce((s, b) => s + b.wasteLength, 0)

  return {
    bars,
    totalWastePct: totalLength > 0 ? (totalWaste / totalLength) * 100 : 0,
    unusedStock: stockBars
      .filter(s => (remaining.get(s.id) ?? 0) > 0)
      .map(s => ({ stock: s, quantity: remaining.get(s.id) ?? 0 })),
    unplacedParts: Array.from(unplacedCounts.values()),
  }
}
