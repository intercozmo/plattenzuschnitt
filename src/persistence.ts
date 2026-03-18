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
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(SCHEMA_VERSION_KEY, JSON.stringify(state))
}
