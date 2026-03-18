// src/persistence.ts
import { SCHEMA_VERSION_KEY } from './constants'
import type { StockPlate, CutPiece } from './types'

interface PersistedState {
  stockPlates: StockPlate[];
  cutPieces: CutPiece[];
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
    return parsed as PersistedState
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
