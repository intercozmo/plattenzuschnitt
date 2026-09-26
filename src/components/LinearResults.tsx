// src/components/LinearResults.tsx
import { Fragment } from 'react'
import type { LinearPlan } from '../types'
import { offcutLength } from './LinearDiagram'
import { itemLabel, sectionLabel } from '../utils/items'

interface Props {
  plan: LinearPlan
  kerf: number
}

export default function LinearResults({ plan, kerf }: Props) {
  const totalAvailable = plan.bars.length + plan.unusedStock.reduce((s, u) => s + u.quantity, 0)
  const totalLengthM = plan.bars.reduce((s, b) => s + b.stock.length, 0) / 1000
  const totalCuts = plan.bars.reduce((s, b) => s + b.cuts, 0)
  const materialCost = plan.bars.reduce((s, b) => s + (b.stock.price ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Zusammenfassung</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Stangen verwendet</dt>
          <dd className="text-slate-800 font-medium text-right">{plan.bars.length} / {totalAvailable} Stück</dd>

          <dt className="text-slate-500">Gesamtlänge</dt>
          <dd className="text-slate-800 font-medium text-right">{totalLengthM.toFixed(2)} m</dd>

          <dt className="text-slate-500">Gesamtschnitte</dt>
          <dd className="text-slate-800 font-medium text-right">{totalCuts}</dd>

          <dt className="text-slate-500 bg-amber-50">Verschnitt gesamt</dt>
          <dd className="text-slate-800 font-medium text-right bg-amber-50">{plan.totalWastePct.toFixed(1)} %</dd>

          {materialCost > 0 && (
            <>
              <dt className="text-slate-500">Materialkosten</dt>
              <dd className="text-slate-800 font-medium text-right">
                {materialCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </dd>
            </>
          )}

          {plan.unplacedParts.length > 0 && (
            <>
              <dt className="text-red-500 font-medium">Nicht platziert</dt>
              <dd className="text-red-600 font-semibold text-right">
                {plan.unplacedParts.reduce((s, p) => s + p.quantity, 0)} Stück
              </dd>
            </>
          )}
        </dl>
      </div>

      {plan.unplacedParts.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">Nicht platzierte Teile</h3>
          <ul className="space-y-1">
            {plan.unplacedParts.map(part => (
              <li key={part.id} className="text-sm text-red-600">
                {itemLabel(part)} — {part.length} mm{sectionLabel(part) && ` (${sectionLabel(part)})`}
                {part.quantity > 1 && ` ${part.quantity}×`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50">Schnittliste</div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1 px-2 text-slate-400 font-medium w-6">#</th>
              <th className="text-left py-1 px-2 text-slate-400 font-medium">Teil</th>
              <th className="text-right py-1 px-2 text-slate-400 font-medium">Länge</th>
              <th className="text-right py-1 px-2 text-slate-400 font-medium">Schnitt bei</th>
            </tr>
          </thead>
          <tbody>
            {plan.bars.map((bar, i) => {
              const offcut = offcutLength(bar, kerf)
              return (
                <Fragment key={`${bar.stock.id}-${bar.barIndex}`}>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="py-1 px-2 text-slate-500 font-medium">
                      Stange {i + 1}: {bar.stock.length} mm{sectionLabel(bar.stock) && ` · ${sectionLabel(bar.stock)}`}
                      {bar.stock.label ? ` — ${bar.stock.label}` : ''}
                    </td>
                  </tr>
                  {bar.placements.map((p, j) => (
                    <tr key={j} className="border-b border-slate-50">
                      <td className="py-1 px-2 text-slate-400">{j + 1}</td>
                      <td className="py-1 px-2 text-slate-600">{itemLabel(p.part)}</td>
                      <td className="py-1 px-2 text-slate-600 text-right">{p.part.length} mm</td>
                      <td className="py-1 px-2 text-blue-600 text-right">{p.offset + p.part.length} mm</td>
                    </tr>
                  ))}
                  {offcut > 0 && (
                    <tr className="border-b border-slate-50">
                      <td />
                      <td className="py-1 px-2 text-rose-600" colSpan={3}>Rest {offcut} mm</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
