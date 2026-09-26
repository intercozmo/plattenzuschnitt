// src/persistence.ts
import { SCHEMA_VERSION_KEY } from './constants'
import type { StockPlate, CutPiece, Grain, OptimizationPriority, AppMode, StockBar, LinearPart } from './types'

export interface PersistedState {
  stockPlates: StockPlate[];
  cutPieces: CutPiece[];
  kerf?: number;
  grainEnabled?: boolean;
  priority?: OptimizationPriority;
  trimLeft?: number;
  trimTop?: number;
  projectName?: string;
  mode?: AppMode;
  stockBars?: StockBar[];
  linearParts?: LinearPart[];
  linearTrim?: number;
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (!raw) return null
    return parsePersistedState(JSON.parse(raw))
  } catch {
    return null
  }
}

// Validates and back-fills persisted data (localStorage state and project files)
export function parsePersistedState(parsed: any): PersistedState | null {
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
      price: typeof p.price === 'number' ? p.price : 0,
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
  if (typeof parsed.trimLeft === 'number') {
    result.trimLeft = parsed.trimLeft
  }
  if (typeof parsed.trimTop === 'number') {
    result.trimTop = parsed.trimTop
  }
  if (typeof parsed.projectName === 'string') {
    result.projectName = parsed.projectName
  }
  if (parsed.mode === '1d' || parsed.mode === '2d') {
    result.mode = parsed.mode
  }
  if (Array.isArray(parsed.stockBars)) {
    result.stockBars = parsed.stockBars.map((b: StockBar) => ({
      ...b,
      profile: typeof b.profile === 'string' ? b.profile : '',
      price: typeof b.price === 'number' ? b.price : 0,
    }))
  }
  if (Array.isArray(parsed.linearParts)) {
    result.linearParts = parsed.linearParts.map((p: LinearPart) => ({
      ...p,
      profile: typeof p.profile === 'string' ? p.profile : '',
    }))
  }
  if (typeof parsed.linearTrim === 'number') {
    result.linearTrim = parsed.linearTrim
  }
  return result
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(SCHEMA_VERSION_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('[Plattenzuschnitt] Failed to persist state:', err)
  }
}
