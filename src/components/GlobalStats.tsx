// src/components/GlobalStats.tsx
import type { CutPlan, CutNode } from '../types'
import { useStore } from '../store'

interface Props {
  plan: CutPlan
  kerf: number
}

// Helper function to sum cut lengths from a CutNode tree
function sumCutLength(node: CutNode): number {
  // Each cut spans the full width (horizontal) or full height (vertical) of its sub-panel
  const len = node.direction === 'horizontal' ? node.panelWidth : node.panelHeight
  let total = len
  if (node.children) {
    for (const child of node.children) total += sumCutLength(child)
  }
  return total
}

// Helper function to count total number of cuts in a CutNode tree
function countCuts(node: CutNode): number {
  let count = 1  // Count this node as 1 cut
  if (node.children) {
    for (const child of node.children) count += countCuts(child)
  }
  return count
}

export default function GlobalStats({ plan }: Props) {
  const priority = useStore(s => s.priority)

  const totalPlateArea = plan.plates.reduce(
    (sum, p) => sum + p.stock.width * p.stock.height,
    0
  )
  const totalPlateAreaCm2 = totalPlateArea / 100

  // Compute total cut length in mm
  const totalCutLengthMm = plan.plates.reduce((sum, plate) => {
    return sum + (plate.cutTree ? sumCutLength(plate.cutTree) : 0)
  }, 0)
  const totalCutLengthM = (totalCutLengthMm / 1000).toFixed(1)

  // Compute total number of cuts
  const totalCuts = plan.plates.reduce((sum, plate) => {
    return sum + (plate.cutTree ? countCuts(plate.cutTree) : 0)
  }, 0)

  // Compute used/total plates
  const totalAvailablePlates =
    plan.plates.length + plan.unusedStockPlates.reduce((s, u) => s + u.quantity, 0)

  // Map priority to German label
  const priorityLabel = {
    'least-waste': 'Wenig Verschnitt',
    'least-cuts': 'Wenig Schnitte',
    'balanced': 'Ausgewogen',
  }[priority]

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
        Zusammenfassung
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">Platten verwendet</dt>
        <dd className="text-slate-800 font-medium text-right">
          {plan.plates.length} / {totalAvailablePlates} Stück
        </dd>

        <dt className="text-slate-500">Gesamtfläche</dt>
        <dd className="text-slate-800 font-medium text-right">
          {totalPlateAreaCm2.toFixed(0)} cm²
        </dd>

        <dt className="text-slate-500">Gesamtschnittlänge</dt>
        <dd className="text-slate-800 font-medium text-right">
          {totalCutLengthM} m
        </dd>

        <dt className="text-slate-500">Gesamtschnitte</dt>
        <dd className="text-slate-800 font-medium text-right">
          {totalCuts}
        </dd>

        <dt className="text-slate-500 bg-amber-50">Verschnitt gesamt</dt>
        <dd className="text-slate-800 font-medium text-right bg-amber-50">
          {plan.totalWastePct.toFixed(1)} %
        </dd>

        <dt className="text-slate-500">Optimierung</dt>
        <dd className="text-slate-800 font-medium text-right">
          {priorityLabel}
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
