// src/components/ResultsPanel.tsx
import type { CutPlan } from '../types'
import GlobalStats from './GlobalStats'
import SheetStats from './SheetStats'
import CutList from './CutList'

interface Props {
  plan: CutPlan
  kerf: number
}

export default function ResultsPanel({ plan, kerf }: Props) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full p-4">
      <GlobalStats plan={plan} kerf={kerf} />

      {plan.plates.map((plate, i) => (
        <div key={`${plate.stock.id}-${plate.plateIndex}`} className="flex flex-col gap-2">
          <SheetStats plate={plate} plateNumber={i + 1} />
          <CutList plate={plate} plateNumber={i + 1} />
        </div>
      ))}

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
