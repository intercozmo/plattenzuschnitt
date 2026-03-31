// src/components/SheetStats.tsx
import type { PlacedPlate } from '../types'
import CollapsibleSection from './CollapsibleSection'

interface Props {
  plate: PlacedPlate
  plateNumber: number
}

export default function SheetStats({ plate, plateNumber }: Props) {
  const title = `Platte ${plateNumber} — ${plate.stock.width}×${plate.stock.height} mm`

  return (
    <CollapsibleSection title={title} defaultOpen={false}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {plate.stock.label && (
          <>
            <dt className="text-slate-500">Bezeichnung</dt>
            <dd className="text-slate-700 font-medium text-right">{plate.stock.label}</dd>
          </>
        )}
        <dt className="text-slate-500">Teile</dt>
        <dd className="text-slate-700 font-medium text-right">{plate.placements.length}</dd>

        <dt className="text-slate-500">Verschnitt</dt>
        <dd className="text-slate-700 font-medium text-right">{plate.wastePct.toFixed(1)} %</dd>
      </dl>
    </CollapsibleSection>
  )
}
