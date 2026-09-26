// src/store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { nanoid } from 'nanoid'
import type { StockPlate, CutPiece, Grain, OptimizationPriority, AppMode, StockBar, LinearPart } from './types'
import { loadState, saveState, type PersistedState } from './persistence'
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
  addStockPlate: (label: string, width: number, height: number, thickness: number, grain: Grain, quantity: number, price: number) => void;
  updateStockPlate: (id: string, updates: Partial<Omit<StockPlate, 'id'>>) => void;
  removeStockPlate: (id: string) => void;
  replaceStockPlates: (plates: Array<Omit<StockPlate, 'id'>>) => void;
  appendStockPlates: (plates: Array<Omit<StockPlate, 'id'>>) => void;

  // Piece actions
  addCutPiece: (name: string, width: number, height: number, thickness: number, quantity: number, grain: Grain) => void;
  updateCutPiece: (id: string, updates: Partial<Omit<CutPiece, 'id'>>) => void;
  removeCutPiece: (id: string) => void;
  replaceCutPieces: (pieces: Array<{ name: string; width: number; height: number; thickness: number; quantity: number; grain: 'any' | 'horizontal' | 'vertical' }>) => void;
  appendCutPieces: (pieces: Array<{ name: string; width: number; height: number; thickness: number; quantity: number; grain: 'any' | 'horizontal' | 'vertical' }>) => void;

  // Option actions
  setKerf: (kerf: number) => void;
  setGrainEnabled: (enabled: boolean) => void;
  setPriority: (priority: OptimizationPriority) => void;
  setTrimLeft: (v: number) => void;
  setTrimTop: (v: number) => void;

  // 1D linear cutting
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  stockBars: StockBar[];
  linearParts: LinearPart[];
  linearTrim: number;
  addStockBar: (bar: Omit<StockBar, 'id'>) => void;
  updateStockBar: (id: string, updates: Partial<Omit<StockBar, 'id'>>) => void;
  removeStockBar: (id: string) => void;
  replaceStockBars: (bars: Array<Omit<StockBar, 'id'>>) => void;
  appendStockBars: (bars: Array<Omit<StockBar, 'id'>>) => void;
  addLinearPart: (part: Omit<LinearPart, 'id'>) => void;
  updateLinearPart: (id: string, updates: Partial<Omit<LinearPart, 'id'>>) => void;
  removeLinearPart: (id: string) => void;
  replaceLinearParts: (parts: Array<Omit<LinearPart, 'id'>>) => void;
  appendLinearParts: (parts: Array<Omit<LinearPart, 'id'>>) => void;
  setLinearTrim: (v: number) => void;

  // Project actions
  projectName: string;
  setProjectName: (name: string) => void;
  loadProjectData: (name: string, data: PersistedState) => void;

  // Phase flag: use InlineTable as the primary rendering for PiecesTable behind a feature flag
  useInlineTableForPieces: boolean;
  setUseInlineTableForPieces: (enabled: boolean) => void;
}

const persisted = loadState()

// Input state that is saved to localStorage and into projects
export function selectPersisted(state: AppState): PersistedState {
  return {
    stockPlates: state.stockPlates,
    cutPieces: state.cutPieces,
    kerf: state.kerf,
    grainEnabled: state.grainEnabled,
    priority: state.priority,
    trimLeft: state.trimLeft,
    trimTop: state.trimTop,
    projectName: state.projectName,
    mode: state.mode,
    stockBars: state.stockBars,
    linearParts: state.linearParts,
    linearTrim: state.linearTrim,
  }
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    stockPlates: persisted?.stockPlates ?? [],
    cutPieces: persisted?.cutPieces ?? [],
    kerf: persisted?.kerf ?? DEFAULT_KERF_MM,
    grainEnabled: persisted?.grainEnabled ?? false,
    priority: persisted?.priority ?? 'least-waste',
    trimLeft: persisted?.trimLeft ?? 0,
    trimTop: persisted?.trimTop ?? 0,
    projectName: persisted?.projectName ?? '',
    mode: persisted?.mode ?? '2d',
    stockBars: persisted?.stockBars ?? [],
    linearParts: persisted?.linearParts ?? [],
    linearTrim: persisted?.linearTrim ?? 0,

    addStockPlate: (label, width, height, thickness, grain, quantity, price) =>
      set(s => ({ stockPlates: [...s.stockPlates, { id: nanoid(), label, width, height, thickness, grain, quantity, price }] })),

    updateStockPlate: (id, updates) =>
      set(s => ({ stockPlates: s.stockPlates.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeStockPlate: (id) =>
      set(s => ({ stockPlates: s.stockPlates.filter(p => p.id !== id) })),

    replaceStockPlates: (plates) =>
      set(() => ({ stockPlates: plates.map(p => ({ id: nanoid(), ...p })) })),

    appendStockPlates: (plates) =>
      set(s => ({ stockPlates: [...s.stockPlates, ...plates.map(p => ({ id: nanoid(), ...p }))] })),

    addCutPiece: (name, width, height, thickness, quantity, grain) =>
      set(s => ({ cutPieces: [...s.cutPieces, { id: nanoid(), name, width, height, thickness, quantity, grain }] })),

    updateCutPiece: (id, updates) =>
      set(s => ({ cutPieces: s.cutPieces.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeCutPiece: (id) =>
      set(s => ({ cutPieces: s.cutPieces.filter(p => p.id !== id) })),

    replaceCutPieces: (pieces) =>
      set(() => ({ cutPieces: pieces.map(p => ({ id: nanoid(), ...p })) })),

    appendCutPieces: (pieces) =>
      set(s => ({ cutPieces: [...s.cutPieces, ...pieces.map(p => ({ id: nanoid(), ...p }))] })),

    setKerf: (kerf) => set({ kerf }),

    setGrainEnabled: (enabled) => set({ grainEnabled: enabled }),

    setPriority: (priority) => set({ priority }),

    setTrimLeft: (trimLeft) => set({ trimLeft }),

    setTrimTop: (trimTop) => set({ trimTop }),

    setMode: (mode) => set({ mode }),

    addStockBar: (bar) =>
      set(s => ({ stockBars: [...s.stockBars, { id: nanoid(), ...bar }] })),

    updateStockBar: (id, updates) =>
      set(s => ({ stockBars: s.stockBars.map(b => b.id === id ? { ...b, ...updates } : b) })),

    removeStockBar: (id) =>
      set(s => ({ stockBars: s.stockBars.filter(b => b.id !== id) })),

    replaceStockBars: (bars) =>
      set(() => ({ stockBars: bars.map(b => ({ id: nanoid(), ...b })) })),

    appendStockBars: (bars) =>
      set(s => ({ stockBars: [...s.stockBars, ...bars.map(b => ({ id: nanoid(), ...b }))] })),

    addLinearPart: (part) =>
      set(s => ({ linearParts: [...s.linearParts, { id: nanoid(), ...part }] })),

    updateLinearPart: (id, updates) =>
      set(s => ({ linearParts: s.linearParts.map(p => p.id === id ? { ...p, ...updates } : p) })),

    removeLinearPart: (id) =>
      set(s => ({ linearParts: s.linearParts.filter(p => p.id !== id) })),

    replaceLinearParts: (parts) =>
      set(() => ({ linearParts: parts.map(p => ({ id: nanoid(), ...p })) })),

    appendLinearParts: (parts) =>
      set(s => ({ linearParts: [...s.linearParts, ...parts.map(p => ({ id: nanoid(), ...p }))] })),

    setLinearTrim: (linearTrim) => set({ linearTrim }),

    setProjectName: (projectName) => set({ projectName }),

    // Replaces all inputs; missing options fall back to defaults
    loadProjectData: (name, data) => set({
      stockPlates: data.stockPlates,
      cutPieces: data.cutPieces,
      kerf: data.kerf ?? DEFAULT_KERF_MM,
      grainEnabled: data.grainEnabled ?? false,
      priority: data.priority ?? 'least-waste',
      trimLeft: data.trimLeft ?? 0,
      trimTop: data.trimTop ?? 0,
      projectName: name,
      mode: data.mode ?? '2d',
      stockBars: data.stockBars ?? [],
      linearParts: data.linearParts ?? [],
      linearTrim: data.linearTrim ?? 0,
    }),

    // Feature flag default: true (phase 1 uses InlineTable). Can be toggled to test migration path.
    useInlineTableForPieces: true,
    setUseInlineTableForPieces: (enabled: boolean) => set({ useInlineTableForPieces: enabled }),
  }))
)

// Auto-persist on every state change (shallow equality prevents unnecessary saves)
useStore.subscribe(selectPersisted, saveState, { equalityFn: shallow })
