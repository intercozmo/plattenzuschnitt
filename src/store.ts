// src/store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { nanoid } from 'nanoid'
import type { StockPlate, CutPiece, Grain } from './types'
import { loadState, saveState } from './persistence'

interface AppState {
  stockPlates: StockPlate[];
  cutPieces: CutPiece[];

  // Stock actions
  addStockPlate: (label: string, width: number, height: number, quantity: number) => void;
  updateStockPlate: (id: string, updates: Partial<Omit<StockPlate, 'id'>>) => void;
  removeStockPlate: (id: string) => void;

  // Piece actions
  addCutPiece: (name: string, width: number, height: number, quantity: number, grain: Grain) => void;
  updateCutPiece: (id: string, updates: Partial<Omit<CutPiece, 'id'>>) => void;
  removeCutPiece: (id: string) => void;
}

const persisted = loadState()

export const useStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    stockPlates: persisted?.stockPlates ?? [],
    cutPieces: persisted?.cutPieces ?? [],

    addStockPlate: (label, width, height, quantity) =>
      set(s => ({ stockPlates: [...s.stockPlates, { id: nanoid(), label, width, height, quantity }] })),

    updateStockPlate: (id, updates) =>
      set(s => ({ stockPlates: s.stockPlates.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeStockPlate: (id) =>
      set(s => ({ stockPlates: s.stockPlates.filter(p => p.id !== id) })),

    addCutPiece: (name, width, height, quantity, grain) =>
      set(s => ({ cutPieces: [...s.cutPieces, { id: nanoid(), name, width, height, quantity, grain }] })),

    updateCutPiece: (id, updates) =>
      set(s => ({ cutPieces: s.cutPieces.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeCutPiece: (id) =>
      set(s => ({ cutPieces: s.cutPieces.filter(p => p.id !== id) })),
  }))
)

// Auto-persist on every state change (shallow equality prevents unnecessary saves)
useStore.subscribe(
  state => ({ stockPlates: state.stockPlates, cutPieces: state.cutPieces }),
  ({ stockPlates, cutPieces }) => saveState({ stockPlates, cutPieces }),
  { equalityFn: shallow }
)
