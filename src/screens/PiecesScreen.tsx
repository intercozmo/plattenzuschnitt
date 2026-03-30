// src/screens/PiecesScreen.tsx
import { useState } from 'react'
import { useStore } from '../store'
import PieceForm from '../components/PieceForm'
import { computeCutPlan } from '../algorithm/guillotine'
import { MAX_TOTAL_PIECES } from '../constants'
import type { CutPiece, CutPlan } from '../types'

interface Props {
  onBack: () => void
  onPlanReady: (plan: CutPlan) => void
}

export default function PiecesScreen({ onBack, onPlanReady }: Props) {
  const { cutPieces, stockPlates, kerf, priority, addCutPiece, updateCutPiece, removeCutPiece } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CutPiece | null>(null)

  const totalPieces = cutPieces.reduce((s, p) => s + p.quantity, 0)
  const overLimit = totalPieces > MAX_TOTAL_PIECES
  const canCompute = cutPieces.length > 0 && stockPlates.length > 0 && !overLimit

  function handleSave(name: string, width: number, height: number, quantity: number, grain: CutPiece['grain']) {
    if (editing) {
      updateCutPiece(editing.id, { name, width, height, quantity, grain })
      setEditing(null)
    } else {
      addCutPiece(name, width, height, quantity, grain)
    }
    setShowForm(false)
  }

  function handleCompute() {
    const plan = computeCutPlan(stockPlates, cutPieces, kerf, priority)
    onPlanReady(plan)
  }

  if (showForm || editing) {
    return (
      <PieceForm
        initial={editing ?? undefined}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditing(null) }}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-white text-lg">←</button>
        <h1 className="font-bold text-lg">Stückliste</h1>
      </header>
      <main className="flex-1 p-4 space-y-2">
        {cutPieces.length === 0 && (
          <p className="text-slate-500 text-center py-8">Noch keine Stücke. Füge Zuschnitte hinzu.</p>
        )}
        {overLimit && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
            Maximale Stückzahl ({MAX_TOTAL_PIECES}) überschritten. Bitte reduzieren.
          </p>
        )}
        {cutPieces.map(piece => (
          <div key={piece.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{piece.name}</div>
              <div className="text-sm text-slate-500">
                {piece.width}×{piece.height} mm · {piece.quantity}× · Maserung: {
                  ({ any: 'Keine', horizontal: 'Längs', vertical: 'Quer' } as Record<string, string>)[piece.grain]
                }
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(piece)} className="text-blue-600 text-sm px-2">Bearb.</button>
              <button onClick={() => removeCutPiece(piece.id)} className="text-red-500 text-sm px-2">✕</button>
            </div>
          </div>
        ))}
      </main>
      <footer className="p-4 space-y-2">
        <button onClick={() => setShowForm(true)} className="w-full bg-slate-200 rounded-lg py-3 font-medium">
          + Stück hinzufügen
        </button>
        <button onClick={handleCompute} disabled={!canCompute}
          className="w-full bg-green-600 disabled:bg-slate-300 text-white rounded-lg py-3 font-semibold">
          Schnittplan berechnen ⚡
        </button>
        {!canCompute && !overLimit && (
          <p className="text-xs text-slate-500 text-center">
            {stockPlates.length === 0 ? 'Keine Platten definiert.' : 'Stückliste ist leer.'}
          </p>
        )}
      </footer>
    </div>
  )
}
