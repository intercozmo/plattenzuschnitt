// src/screens/ResultScreen.tsx
import { useState } from 'react'
import { COLOR_PALETTE } from '../constants'
import CutDiagram from '../components/CutDiagram'
import CutSequence from '../components/CutSequence'
import MaterialSummary from '../components/MaterialSummary'
import { useStore } from '../store'
import type { CutPlan } from '../types'

type Tab = 'diagram' | 'sequence' | 'material'

interface Props {
  plan: CutPlan
  onBack: () => void
}

export default function ResultScreen({ plan, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('diagram')
  const [selectedPlateIdx, setSelectedPlateIdx] = useState(0)
  const kerf = useStore(s => s.kerf)

  const pieceColorMap = new Map<string, string>()
  plan.plates.forEach(plate => {
    plate.placements.forEach(p => {
      if (!pieceColorMap.has(p.piece.id)) {
        pieceColorMap.set(p.piece.id, COLOR_PALETTE[pieceColorMap.size % COLOR_PALETTE.length])
      }
    })
  })

  const currentPlate = plan.plates[selectedPlateIdx]

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'diagram', label: 'Schnittplan' },
    { id: 'sequence', label: 'Schnittfolge' },
    { id: 'material', label: 'Material' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-white text-lg">←</button>
        <h1 className="font-bold text-lg">Ergebnis</h1>
        <span className="text-slate-400 text-sm ml-auto">{plan.totalWastePct.toFixed(1)}% Verschnitt</span>
      </header>
      <div className="flex border-b border-slate-200 bg-white">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {(tab === 'diagram' || tab === 'sequence') && plan.plates.length > 1 && (
        <div className="flex gap-2 p-3 bg-slate-50 border-b overflow-x-auto">
          {plan.plates.map((p, i) => (
            <button key={i} onClick={() => setSelectedPlateIdx(i)}
              className={`shrink-0 px-3 py-1 rounded text-sm ${i === selectedPlateIdx ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>
              Platte {i + 1} ({p.stock.label})
            </button>
          ))}
        </div>
      )}
      <main className="flex-1 p-4">
        {plan.plates.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Keine Stücke konnten platziert werden.</p>
        ) : (
          <>
            {tab === 'diagram' && currentPlate && (
              <CutDiagram plate={currentPlate} pieceColorMap={pieceColorMap} kerf={kerf} />
            )}
            {tab === 'sequence' && currentPlate && (
              <CutSequence plate={currentPlate} />
            )}
            {tab === 'material' && (
              <MaterialSummary plan={plan} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
