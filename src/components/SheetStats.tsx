// src/components/SheetStats.tsx
import type { PlacedPlate } from '../types'

interface Props {
  plate: PlacedPlate
  plateNumber: number
}

export default function SheetStats({ plate, plateNumber }: Props) {
  return (
    <div className="border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <div className="text-xs font-medium text-slate-600 mb-1">
        Platte {plateNumber}: {plate.stock.width}×{plate.stock.height} mm
        {plate.stock.label ? ` — ${plate.stock.label}` : ''}
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{plate.placements.length} Teile</span>
        <span>Verschnitt {plate.wastePct.toFixed(1)}%</span>
      </div>
    </div>
  )
}
