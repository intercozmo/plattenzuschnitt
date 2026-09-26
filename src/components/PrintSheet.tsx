// src/components/PrintSheet.tsx
// Workshop sheet that is only visible when printing (or "Save as PDF")
import type { CutPlan } from '../types'
import { useStore } from '../store'
import { buildPieceColorMap } from './DiagramPanel'
import CutDiagram from './CutDiagram'
import GlobalStats from './GlobalStats'
import SheetStats from './SheetStats'
import CutList from './CutList'

interface Props {
  plan: CutPlan
  kerf: number
  trimLeft: number
  trimTop: number
}

export default function PrintSheet({ plan, kerf, trimLeft, trimTop }: Props) {
  const pieceColorMap = buildPieceColorMap(plan)
  const projectName = useStore(s => s.projectName)

  return (
    <div className="print-sheet hidden print:block text-slate-800">
      <div className="flex items-baseline justify-between border-b border-slate-300 pb-2 mb-4">
        <h1 className="text-xl font-bold">Schnittplan{projectName ? ` – ${projectName}` : ''}</h1>
        <span className="text-sm text-slate-500">{new Date().toLocaleDateString('de-DE')}</span>
      </div>

      <div className="mb-6">
        <GlobalStats plan={plan} kerf={kerf} />
      </div>

      {plan.unplacedPieces.length > 0 && (
        <div className="mb-6 border border-red-300 rounded p-3">
          <h2 className="text-sm font-semibold text-red-700 mb-1">
            Nicht platzierte Teile ({plan.unplacedPieces.length})
          </h2>
          <ul className="text-sm">
            {plan.unplacedPieces.map(piece => (
              <li key={piece.id}>
                {piece.name} — {piece.width}×{piece.height} mm
                {piece.quantity > 1 && ` (${piece.quantity}×)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.plates.map((plate, idx) => (
        <section key={`${plate.stock.id}-${plate.plateIndex}`} className="break-before-page">
          <div className="mb-2">
            <SheetStats plate={plate} plateNumber={idx + 1} />
          </div>
          <div className="break-inside-avoid mb-4">
            <CutDiagram
              plate={plate}
              plateNumber={idx + 1}
              pieceColorMap={pieceColorMap}
              kerf={kerf}
              trimLeft={trimLeft}
              trimTop={trimTop}
            />
          </div>
          <h2 className="text-sm font-semibold mb-1">Schnittfolge</h2>
          <CutList plates={[plate]} startPlateNumber={idx + 1} />
        </section>
      ))}
    </div>
  )
}
