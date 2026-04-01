// src/store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { nanoid } from 'nanoid'
import type { StockPlate, CutPiece, Grain, OptimizationPriority } from './types'
import { loadState, saveState } from './persistence'
import { DEFAULT_KERF_MM } from './constants'

interface AppState {
  stockPlates: StockPlate[];
  cutPieces: CutPiece[];
  kerf: number;
  grainEnabled: boolean;
  priority: OptimizationPriority;
  trimLeft: number;
  trimTop: number;

  // Stock actions
  addStockPlate: (label: string, width: number, height: number, thickness: number, grain: Grain, quantity: number) => void;
  updateStockPlate: (id: string, updates: Partial<Omit<StockPlate, 'id'>>) => void;
  removeStockPlate: (id: string) => void;

  // Piece actions
  addCutPiece: (name: string, width: number, height: number, thickness: number, quantity: number, grain: Grain) => void;
  updateCutPiece: (id: string, updates: Partial<Omit<CutPiece, 'id'>>) => void;
  removeCutPiece: (id: string) => void;

  // Option actions
  setKerf: (kerf: number) => void;
  setGrainEnabled: (enabled: boolean) => void;
  setPriority: (priority: OptimizationPriority) => void;
  setTrimLeft: (v: number) => void;
  setTrimTop: (v: number) => void;
}

const persisted = loadState()

export const useStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    stockPlates: persisted?.stockPlates ?? [],
    cutPieces: persisted?.cutPieces ?? [],
    kerf: persisted?.kerf ?? DEFAULT_KERF_MM,
    grainEnabled: persisted?.grainEnabled ?? false,
    priority: persisted?.priority ?? 'least-waste',
    trimLeft: persisted?.trimLeft ?? 0,
    trimTop: persisted?.trimTop ?? 0,

    addStockPlate: (label, width, height, thickness, grain, quantity) =>
      set(s => ({ stockPlates: [...s.stockPlates, { id: nanoid(), label, width, height, thickness, grain, quantity }] })),

    updateStockPlate: (id, updates) =>
      set(s => ({ stockPlates: s.stockPlates.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeStockPlate: (id) =>
      set(s => ({ stockPlates: s.stockPlates.filter(p => p.id !== id) })),

    addCutPiece: (name, width, height, thickness, quantity, grain) =>
      set(s => ({ cutPieces: [...s.cutPieces, { id: nanoid(), name, width, height, thickness, quantity, grain }] })),

    updateCutPiece: (id, updates) =>
      set(s => ({ cutPieces: s.cutPieces.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeCutPiece: (id) =>
      set(s => ({ cutPieces: s.cutPieces.filter(p => p.id !== id) })),

    setKerf: (kerf) => set({ kerf }),

    setGrainEnabled: (enabled) => set({ grainEnabled: enabled }),

    setPriority: (priority) => set({ priority }),

    setTrimLeft: (trimLeft) => set({ trimLeft }),

    setTrimTop: (trimTop) => set({ trimTop }),
  }))
)

// Auto-persist on every state change (shallow equality prevents unnecessary saves)
useStore.subscribe(
  state => ({
    stockPlates: state.stockPlates,
    cutPieces: state.cutPieces,
    kerf: state.kerf,
    grainEnabled: state.grainEnabled,
    priority: state.priority,
    trimLeft: state.trimLeft,
    trimTop: state.trimTop,
  }),
  ({ stockPlates, cutPieces, kerf, grainEnabled, priority, trimLeft, trimTop }) =>
    saveState({ stockPlates, cutPieces, kerf, grainEnabled, priority, trimLeft, trimTop }),
  { equalityFn: shallow }
)
