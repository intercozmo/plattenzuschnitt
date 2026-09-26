// src/components/ModeToggle.tsx
import { useStore } from '../store'
import type { AppMode } from '../types'

const MODES: Array<{ id: AppMode; label: string }> = [
  { id: '2d', label: 'Platten (2D)' },
  { id: '1d', label: 'Stangen (1D)' },
]

export default function ModeToggle() {
  const mode = useStore(s => s.mode)
  const setMode = useStore(s => s.setMode)

  return (
    <div className="flex m-3 mb-0 rounded-lg border border-slate-300 overflow-hidden text-sm" role="tablist">
      {MODES.map(m => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          onClick={() => setMode(m.id)}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            mode === m.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
