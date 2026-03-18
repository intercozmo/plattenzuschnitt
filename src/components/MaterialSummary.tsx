// src/components/MaterialSummary.tsx
import type { CutPlan } from '../types'

export default function MaterialSummary({ plan }: { plan: CutPlan }) {
  const grouped = new Map<string, { label: string; count: number; totalWastePct: number }>()
  for (const p of plan.plates) {
    const existing = grouped.get(p.stock.id)
    if (existing) {
      existing.count++
      existing.totalWastePct += p.wastePct
    } else {
      grouped.set(p.stock.id, { label: p.stock.label, count: 1, totalWastePct: p.wastePct })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-sm text-slate-600">Gesamtverschnitt</p>
        <p className="text-2xl font-bold text-blue-700">{plan.totalWastePct.toFixed(1)}%</p>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Verwendete Platten</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-1">Platte</th>
              <th className="pb-1 text-right">Anzahl</th>
              <th className="pb-1 text-right">Ø Verschnitt</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.values()).map((g, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{g.label}</td>
                <td className="py-2 text-right">{g.count}×</td>
                <td className="py-2 text-right">{(g.totalWastePct / g.count).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {plan.unusedStockPlates.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Nicht benötigte Platten</h3>
          {plan.unusedStockPlates.map(({ stock, quantity }, i) => (
            <div key={i} className="text-sm text-slate-600">
              {stock.label} ({stock.width}×{stock.height}) — {quantity}× übrig
            </div>
          ))}
        </div>
      )}
      {plan.unplacedPieces.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h3 className="font-semibold text-red-700 mb-1">Nicht platzierbare Stücke</h3>
          {plan.unplacedPieces.map((p, i) => (
            <div key={i} className="text-sm text-red-600">
              {p.name} ({p.width}×{p.height} mm) × {p.quantity} — passt auf keine Platte
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
