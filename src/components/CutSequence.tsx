// src/components/CutSequence.tsx
import type { CutStep, PlacedPlate } from '../types'
import { generateCutSequence } from '../algorithm/guillotine'

function StepItem({ step, depth = 0 }: { step: CutStep; depth?: number }) {
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="py-2 border-b border-slate-100 text-sm">
        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${step.direction === 'horizontal' ? 'bg-blue-400' : 'bg-orange-400'}`} />
        {step.context}
      </div>
      {step.subSteps?.map((s, i) => <StepItem key={i} step={s} depth={depth + 1} />)}
    </div>
  )
}

export default function CutSequence({ plate }: { plate: PlacedPlate }) {
  const steps = generateCutSequence(plate)
  if (steps.length === 0) {
    return <p className="text-slate-500 text-sm py-4">Nur ein Stück — kein Schnitt notwendig.</p>
  }
  return (
    <div>
      <div className="flex gap-4 text-xs text-slate-500 mb-2">
        <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Horizontal</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Vertikal</span>
      </div>
      {steps.map((s, i) => <StepItem key={i} step={s} />)}
    </div>
  )
}
