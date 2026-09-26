// src/components/LinearDiagram.tsx
import type { LinearPlan } from '../types'
import { COLOR_PALETTE } from '../constants'
import { itemLabel, sectionLabel, mm } from '../utils/items'

interface Props {
  plan: LinearPlan
  kerf: number
  trimStart: number
}

// Leftover after the last part, minus the kerf of the cut that frees it
export function offcutLength(bar: LinearPlan['bars'][number], kerf: number): number {
  const last = bar.placements[bar.placements.length - 1]
  const rest = bar.stock.length - (last.offset + last.part.length)
  return Math.max(0, rest - kerf)
}

export default function LinearDiagram({ plan, kerf, trimStart }: Props) {
  const maxLength = Math.max(...plan.bars.map(b => b.stock.length))
  const colors = new Map<string, string>()
  for (const bar of plan.bars) {
    for (const p of bar.placements) {
      if (!colors.has(p.part.id)) colors.set(p.part.id, COLOR_PALETTE[colors.size % COLOR_PALETTE.length])
    }
  }

  if (plan.bars.length === 0) {
    return <p className="text-slate-500 text-center py-8">Keine Stangen im Schnittplan.</p>
  }

  return (
    <div>
      <div className="flex p-3 bg-slate-50 border-b print:hidden">
        <span className="flex-1" />
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
        >
          Drucken / PDF
        </button>
      </div>
      <div className="p-4 space-y-5">
        {plan.bars.map((bar, i) => {
          const pct = (mm: number) => `${(mm / bar.stock.length) * 100}%`
          const offcut = offcutLength(bar, kerf)
          return (
            <div key={`${bar.stock.id}-${bar.barIndex}`} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline gap-x-3 text-sm mb-1">
                <span className="font-medium text-slate-700">
                  Stange {i + 1}/{plan.bars.length}: {bar.stock.label ? `${bar.stock.label} ` : ''}L {mm(bar.stock.length)} mm
                  {sectionLabel(bar.stock) && ` · ${sectionLabel(bar.stock)}`}
                </span>
                <span className="text-xs text-slate-500">Verschnitt {bar.wastePct.toFixed(1)}%</span>
              </div>
              <div
                className="relative h-10 rounded border border-slate-500 bg-white"
                style={{
                  width: `${(bar.stock.length / maxLength) * 100}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, #fecaca 0 3px, #fff 3px 8px)',
                }}
              >
                {trimStart > 0 && (
                  <div className="absolute inset-y-0 left-0 bg-amber-300" style={{ width: pct(trimStart) }} title="Anschnitt" />
                )}
                {bar.placements.map((p, j) => (
                  <div
                    key={j}
                    className="absolute inset-y-0 border-r-2 border-slate-800 flex flex-col items-center justify-center overflow-hidden text-slate-900 leading-tight"
                    style={{ left: pct(p.offset), width: pct(p.part.length), background: colors.get(p.part.id) }}
                    title={`${itemLabel(p.part)} – ${mm(p.part.length)} mm`}
                  >
                    <span className="text-xs font-semibold truncate max-w-full px-0.5">{itemLabel(p.part)}</span>
                    <span className="text-[10px] truncate max-w-full px-0.5">{mm(p.part.length)}</span>
                  </div>
                ))}
              </div>
              {offcut > 0 && (
                <div className="text-xs text-rose-600 mt-0.5" style={{ width: `${(bar.stock.length / maxLength) * 100}%`, textAlign: 'right' }}>
                  Rest {mm(offcut)} mm
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
