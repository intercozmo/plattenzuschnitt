// src/persistence.ts
import { SCHEMA_VERSION_KEY } from './constants'
import type { StockPlate, CutPiece, Grain, OptimizationPriority } from './types'

export interface PersistedState {
  stockPlates: StockPlate[];
  cutPieces: CutPiece[];
  kerf?: number;
  grainEnabled?: boolean;
  priority?: OptimizationPriority;
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray(parsed.stockPlates) ||
      !Array.isArray(parsed.cutPieces)
    ) {
      console.warn('[Plattenzuschnitt] Invalid persisted state, discarding.')
      return null
    }
    const result: PersistedState = {
      stockPlates: parsed.stockPlates.map((p: StockPlate & { thickness?: number; grain?: Grain }) => ({
        ...p,
        thickness: typeof p.thickness === 'number' ? p.thickness : 18, // default 18mm
        grain: (p.grain === 'horizontal' || p.grain === 'vertical') ? p.grain : 'any',
      })),
      cutPieces: parsed.cutPieces.map((p: CutPiece & { thickness?: number }) => ({
        ...p,
        thickness: typeof p.thickness === 'number' ? p.thickness : 18,
      })),
    }
    if (typeof parsed.kerf === 'number') {
      result.kerf = parsed.kerf
    }
    if (typeof parsed.grainEnabled === 'boolean') {
      result.grainEnabled = parsed.grainEnabled
    }
    const validPriorities: OptimizationPriority[] = ['least-waste', 'least-cuts', 'balanced']
    if (validPriorities.includes(parsed.priority)) {
      result.priority = parsed.priority
    }
    return result
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('[Plattenzuschnitt] Failed to persist state:', err)
  }
}
