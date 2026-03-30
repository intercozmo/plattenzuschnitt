// src/components/CutList.tsx
import type { PlacedPlate } from '../types'
import { generateCutSequence } from '../algorithm/guillotine'

interface Props {
  plate: PlacedPlate
  plateNumber: number
}

export default function CutList({ plate, plateNumber }: Props) {
  const steps = generateCutSequence(plate)

  if (steps.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic px-1 py-2">
        Keine Schnittfolge verfügbar für Platte {plateNumber}.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-200">
            <th className="pb-1 pr-3 font-medium">#</th>
            <th className="pb-1 pr-3 font-medium">Richtung</th>
            <th className="pb-1 font-medium">Position</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="py-1 pr-3 text-slate-400">{i + 1}</td>
              <td className="py-1 pr-3">
                {step.direction === 'horizontal' ? (
                  <span className="inline-block px-1.5 py-0.5 rounded text-blue-700 bg-blue-50 font-medium">
                    Horizontal
                  </span>
                ) : (
                  <span className="inline-block px-1.5 py-0.5 rounded text-orange-700 bg-orange-50 font-medium">
                    Vertikal
                  </span>
                )}
              </td>
              <td className="py-1 text-slate-700">
                {step.direction === 'horizontal'
                  ? `Y = ${step.position} mm`
                  : `X = ${step.position} mm`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
