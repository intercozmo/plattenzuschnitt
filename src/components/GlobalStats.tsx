// src/components/GlobalStats.tsx
import type { CutPlan } from '../types'

interface Props {
  plan: CutPlan
  kerf: number
}

export default function GlobalStats({ plan }: Props) {
  const totalPlateArea = plan.plates.reduce(
    (sum, p) => sum + p.stock.width * p.stock.height,
    0
  )
  const totalPlateAreaCm2 = totalPlateArea / 100

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
        Zusammenfassung
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">Platten verwendet</dt>
        <dd className="text-slate-800 font-medium text-right">
          {plan.plates.length} Stück
        </dd>

        <dt className="text-slate-500">Gesamtfläche</dt>
        <dd className="text-slate-800 font-medium text-right">
          {totalPlateAreaCm2.toFixed(0)} cm²
        </dd>

        <dt className="text-slate-500">Verschnitt gesamt</dt>
        <dd className="text-slate-800 font-medium text-right">
          {plan.totalWastePct.toFixed(1)} %
        </dd>

        {plan.unplacedPieces.length > 0 && (
          <>
            <dt className="text-red-500 font-medium">Nicht platziert</dt>
            <dd className="text-red-600 font-semibold text-right">
              {plan.unplacedPieces.length} Stück
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}
