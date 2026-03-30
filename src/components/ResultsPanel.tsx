// src/components/ResultsPanel.tsx
import { useState } from 'react'
import type { CutPlan } from '../types'
import GlobalStats from './GlobalStats'
import SheetStats from './SheetStats'
import CutList from './CutList'

interface Props {
  plan: CutPlan
  kerf: number
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  )
}

export default function ResultsPanel({ plan, kerf }: Props) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full p-4">
      <GlobalStats plan={plan} kerf={kerf} />

      {plan.plates.map((plate, i) => (
        <div key={`${plate.stock.id}-${plate.plateIndex}`} className="flex flex-col gap-2">
          <SheetStats plate={plate} plateNumber={i + 1} />
        </div>
      ))}

      <CollapsibleSection title="Schnittfolge">
        <CutList plates={plan.plates} />
      </CollapsibleSection>

      {plan.unplacedPieces.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            Nicht platzierte Teile ({plan.unplacedPieces.length})
          </h3>
          <ul className="space-y-1">
            {plan.unplacedPieces.map((piece) => (
              <li key={piece.id} className="text-sm text-red-600">
                {piece.name} — {piece.width}×{piece.height} mm
                {piece.quantity > 1 && ` (${piece.quantity}×)`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
