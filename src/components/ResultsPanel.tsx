// src/components/ResultsPanel.tsx
import { useState } from 'react'
import type { CutPlan } from '../types'
import type { PieceHighlight } from '../App'
import GlobalStats from './GlobalStats'
import SheetStats from './SheetStats'
import CutList from './CutList'

interface Props {
  plan: CutPlan
  kerf: number
  highlight?: PieceHighlight | null
  onHighlight?: (h: PieceHighlight | null) => void
}

function CollapsibleHeader({
  title,
  open,
  onToggle,
}: {
  title: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors shrink-0"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span>{title}</span>
      <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
    </button>
  )
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
      <CollapsibleHeader title={title} open={open} onToggle={() => setOpen(o => !o)} />
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  )
}

export default function ResultsPanel({ plan, kerf, highlight, onHighlight }: Props) {
  const [schnittfolgeOpen, setSchnittfolgeOpen] = useState(true)

  return (
    <div className="flex flex-col gap-4 h-full p-4 overflow-hidden">
      {/* Fixed sections */}
      <div className="shrink-0">
        <GlobalStats plan={plan} kerf={kerf} />
      </div>

      <div className="shrink-0">
        <CollapsibleSection title={`Platten (${plan.plates.length})`}>
          <div className="flex flex-col gap-2">
            {plan.plates.map((plate, i) => (
              <SheetStats key={`${plate.stock.id}-${plate.plateIndex}`} plate={plate} plateNumber={i + 1} />
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Schnittfolge fills remaining space */}
      <div className={`min-h-0 flex flex-col border border-slate-200 rounded-lg overflow-hidden${schnittfolgeOpen ? ' flex-1' : ''}`}>
        <CollapsibleHeader title="Schnittfolge" open={schnittfolgeOpen} onToggle={() => setSchnittfolgeOpen(o => !o)} />
        {schnittfolgeOpen && (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <CutList plates={plan.plates} highlight={highlight} onHighlight={onHighlight} />
          </div>
        )}
      </div>

      {plan.unplacedPieces.length > 0 && (
        <div className="shrink-0 border border-red-200 bg-red-50 rounded-lg p-4">
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
