// src/components/StockForm.tsx
import { useState } from 'react'
import { PRESET_SIZES } from '../constants'
import type { StockPlate } from '../types'

interface Props {
  initial?: StockPlate
  onSave: (label: string, width: number, height: number, quantity: number) => void
  onCancel: () => void
}

export default function StockForm({ initial, onSave, onCancel }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [width, setWidth] = useState(String(initial?.width ?? ''))
  const [height, setHeight] = useState(String(initial?.height ?? ''))
  const [qty, setQty] = useState(String(initial?.quantity ?? '1'))

  function handlePreset(w: number, h: number, lbl: string) {
    setWidth(String(w))
    setHeight(String(h))
    if (!label) setLabel(lbl)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const w = parseInt(width)
    const h = parseInt(height)
    const q = parseInt(qty)
    if (!w || !h || !q || w <= 0 || h <= 0 || q <= 0) return
    onSave(label || `${w}×${h}`, w, h, q)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <h2 className="font-semibold text-lg">{initial ? 'Platte bearbeiten' : 'Platte hinzufügen'}</h2>
      <div className="flex flex-wrap gap-2">
        {PRESET_SIZES.map(p => (
          <button key={p.label} type="button"
            onClick={() => handlePreset(p.width, p.height, p.label)}
            className="px-2 py-1 text-sm bg-slate-200 rounded">
            {p.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm text-slate-600">Bezeichnung (optional)</span>
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="mt-1 block w-full border rounded px-3 py-2" placeholder="z.B. Sperrholz 18mm" />
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
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-blue-600 text-white rounded py-2 font-medium">Speichern</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-200 rounded py-2">Abbrechen</button>
      </div>
    </form>
  )
}
