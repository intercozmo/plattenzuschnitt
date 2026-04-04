// src/components/CutList.tsx
import { Fragment, useRef, useEffect } from 'react'
import type { PlacedPlate } from '../types'
import type { PieceHighlight } from '../App'
import { generateCutSequence } from '../algorithm/guillotine'

interface Props {
  plates: PlacedPlate[]
  highlight?: PieceHighlight | null
  onHighlight?: (h: PieceHighlight | null) => void
}

export default function CutList({ plates, highlight, onHighlight }: Props) {
  const highlightRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlight && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [highlight])
  // Build per-plate steps with a global counter
  const plateSteps: Array<{
    plate: PlacedPlate
    plateNumber: number
    steps: ReturnType<typeof generateCutSequence>
  }> = []

  for (let i = 0; i < plates.length; i++) {
    const steps = generateCutSequence(plates[i])
    plateSteps.push({ plate: plates[i], plateNumber: i + 1, steps })
  }

  const totalSteps = plateSteps.reduce((s, ps) => s + ps.steps.length, 0)

  if (totalSteps === 0) {
    return (
      <p className="text-sm text-slate-400 italic px-1 py-2">
        Keine Schnittfolge verfügbar
      </p>
    )
  }

  let globalStepNum = 1

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-1 px-2 text-slate-400 font-medium w-6">#</th>
            <th className="text-left py-1 px-2 text-slate-400 font-medium">Platte</th>
            <th className="text-left py-1 px-2 text-slate-400 font-medium">Schnitt</th>
            <th className="text-left py-1 px-2 text-slate-400 font-medium">Ergebnis</th>
          </tr>
        </thead>
        <tbody>
          {plateSteps.map(({ plate, plateNumber, steps }) => (
            <Fragment key={`plate-${plateNumber}`}>
              <tr className="bg-slate-50">
                <td colSpan={4} className="py-1 px-2 text-slate-500 font-medium text-xs">
                  Platte {plateNumber}: {plate.stock.width}×{plate.stock.height} mm
                  {plate.stock.label ? ` — ${plate.stock.label}` : ''}
                </td>
              </tr>
              {steps.map((step) => {
                const stepNum = globalStepNum++
                const panelDims =
                  step.panelWidth != null && step.panelHeight != null
                    ? `${step.panelWidth}×${step.panelHeight} mm`
                    : `${plate.stock.width}×${plate.stock.height} mm`
                const pieceName = step.pieceName
                const isRest = pieceName?.startsWith('Rest ')
                const hasPlacement = !isRest && step.pieceX != null && step.pieceY != null
                const isHighlighted = hasPlacement && highlight?.plateNumber === plateNumber && highlight?.pieceX === step.pieceX && highlight?.pieceY === step.pieceY
                return (
                  <tr
                    key={`step-${stepNum}`}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`border-b border-slate-50 ${isHighlighted ? 'bg-blue-100' : ''} ${hasPlacement ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                    onMouseEnter={hasPlacement ? () => onHighlight?.({ plateNumber, pieceX: step.pieceX!, pieceY: step.pieceY! }) : undefined}
                    onMouseLeave={hasPlacement ? () => onHighlight?.(null) : undefined}
                  >
                    <td className="py-1 px-2 text-slate-400">{stepNum}</td>
                    <td className="py-1 px-2 text-slate-600">{panelDims}</td>
                    <td className="py-1 px-2">
                      <span
                        className={
                          step.direction === 'horizontal'
                            ? 'text-blue-600'
                            : 'text-orange-500'
                        }
                      >
                        {step.direction === 'horizontal'
                          ? `y = ${step.position}`
                          : `x = ${step.position}`}{' '}
                        mm
                      </span>
                    </td>
                    <td className="py-1 px-2 text-slate-600">{pieceName ?? '—'}</td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
