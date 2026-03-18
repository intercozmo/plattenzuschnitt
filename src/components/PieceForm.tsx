// src/components/PieceForm.tsx
import { useState } from 'react'
import type { CutPiece, Grain } from '../types'

interface Props {
  initial?: CutPiece
  onSave: (name: string, width: number, height: number, quantity: number, grain: Grain) => void
  onCancel: () => void
}

const GRAIN_OPTIONS: Array<{ value: Grain; label: string }> = [
  { value: 'any', label: 'Keine' },
  { value: 'horizontal', label: 'Längs' },
  { value: 'vertical', label: 'Quer' },
]

export default function PieceForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [width, setWidth] = useState(String(initial?.width ?? ''))
  const [height, setHeight] = useState(String(initial?.height ?? ''))
  const [qty, setQty] = useState(String(initial?.quantity ?? '1'))
  const [grain, setGrain] = useState<Grain>(initial?.grain ?? 'any')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const w = parseInt(width)
    const h = parseInt(height)
    const q = parseInt(qty)
    if (!w || !h || !q || w <= 0 || h <= 0 || q <= 0) return
    onSave(name || `${w}×${h}`, w, h, q, grain)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <h2 className="font-semibold text-lg">{initial ? 'Stück bearbeiten' : 'Stück hinzufügen'}</h2>
      <label className="block">
        <span className="text-sm text-slate-600">Name (optional)</span>
        <input value={name} onChange={e => setName(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2" placeholder="z.B. Regalseite" />
      </label>
      <div className="flex gap-3">
        <label className="flex-1">
          <span className="text-sm text-slate-600">Breite (mm)</span>
          <input type="number" min="1" value={width} onChange={e => setWidth(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2" required />
        </label>
        <label className="flex-1">
          <span className="text-sm text-slate-600">Höhe (mm)</span>
          <input type="number" min="1" value={height} onChange={e => setHeight(e.target.value)}
            className="mt-1 block w-full border rounded px-3 py-2" required />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-slate-600">Anzahl</span>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2" required />
      </label>
      <fieldset>
        <legend className="text-sm text-slate-600 mb-1">Maserung</legend>
        <div className="flex gap-2">
          {GRAIN_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setGrain(opt.value)}
              className={`flex-1 py-2 rounded border text-sm ${grain === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded py-2 font-medium">Speichern</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-200 rounded py-2">Abbrechen</button>
      </div>
    </form>
  )
}
