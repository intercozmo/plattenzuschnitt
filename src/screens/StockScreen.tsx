// src/screens/StockScreen.tsx
import { useState } from 'react'
import { useStore } from '../store'
import StockForm from '../components/StockForm'
import type { StockPlate } from '../types'

export default function StockScreen({ onNext }: { onNext: () => void }) {
  const { stockPlates, addStockPlate, updateStockPlate, removeStockPlate } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StockPlate | null>(null)

  function handleSave(label: string, width: number, height: number, quantity: number) {
    if (editing) {
      updateStockPlate(editing.id, { label, width, height, quantity })
      setEditing(null)
    } else {
      addStockPlate(label, width, height, quantity)
    }
    setShowForm(false)
  }

  if (showForm || editing) {
    return (
      <StockForm
        initial={editing ?? undefined}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditing(null) }}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-800 text-white px-4 py-3">
        <h1 className="font-bold text-lg">Plattenbestand</h1>
      </header>
      <main className="flex-1 p-4 space-y-2">
        {stockPlates.length === 0 && (
          <p className="text-slate-500 text-center py-8">Noch keine Platten. Füge Platten hinzu.</p>
        )}
        {stockPlates.map(plate => (
          <div key={plate.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{plate.label}</div>
              <div className="text-sm text-slate-500">{plate.width}×{plate.height} mm · {plate.quantity}×</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(plate)} className="text-blue-600 text-sm px-2">Bearb.</button>
              <button onClick={() => removeStockPlate(plate.id)} className="text-red-500 text-sm px-2">✕</button>
            </div>
          </div>
        ))}
      </main>
      <footer className="p-4 space-y-2">
        <button onClick={() => setShowForm(true)}
          className="w-full bg-slate-200 rounded-lg py-3 font-medium">
          + Platte hinzufügen
        </button>
        <button onClick={onNext} disabled={stockPlates.length === 0}
          className="w-full bg-blue-600 disabled:bg-slate-300 text-white rounded-lg py-3 font-semibold">
          Weiter zur Stückliste →
        </button>
      </footer>
    </div>
  )
}
