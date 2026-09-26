// src/components/ShortageNotice.tsx
// Warning shown when not all pieces/parts could be placed, with the missing stock
import type { Shortage } from '../types'
import { formatEuro } from '../utils/items'

interface Props<S, P> {
  unplacedCount: number
  shortage?: Shortage<S, P>
  stockName: string                   // "Platte" / "Stange"
  describeStock: (stock: S) => string
  stockPrice: (stock: S) => number    // € per plate/bar, 0 = no price
  describeItem: (item: P) => string
  itemQuantity: (item: P) => number
}

export default function ShortageNotice<S, P>({ unplacedCount, shortage, stockName, describeStock, stockPrice, describeItem, itemQuantity }: Props<S, P>) {
  if (unplacedCount === 0) return null
  const unfittableCount = shortage?.unfittable.reduce((s, p) => s + itemQuantity(p), 0) ?? 0
  const missingCost = shortage?.missing.reduce((s, m) => s + m.missing * stockPrice(m.stock), 0) ?? 0

  return (
    <div role="alert" className="border border-amber-300 bg-amber-50 rounded-lg p-4 text-sm text-slate-800">
      <h3 className="font-semibold text-amber-800">⚠ Nicht genug Material</h3>
      <p className="mt-1">
        {unplacedCount} {unplacedCount === 1 ? 'Teil konnte' : 'Teile konnten'} nicht platziert werden.
      </p>
      {shortage && shortage.missing.length > 0 && (
        <>
          <p className="mt-2 font-medium">Zusätzlich benötigt:</p>
          <ul className="mt-1 space-y-1">
            {shortage.missing.map((m, i) => {
              const price = stockPrice(m.stock)
              return (
                <li key={i}>
                  <strong>{m.missing} ×</strong> {describeStock(m.stock)}
                  {price > 0 && <> = <strong>{formatEuro(m.missing * price)}</strong> <span className="text-slate-500">(je {formatEuro(price)})</span></>}
                  <span className="text-slate-500"> – vorhanden {m.available}, benötigt {m.needed}</span>
                </li>
              )
            })}
          </ul>
          {missingCost > 0 && (
            <p className="mt-2">Kosten für fehlendes Material: <strong>{formatEuro(missingCost)}</strong></p>
          )}
        </>
      )}
      {unfittableCount > 0 && (
        <>
          <p className="mt-2 font-medium">
            {unfittableCount === 1 ? 'Passt' : `${unfittableCount} Teile passen`} auf keine {stockName} im Bestand
            (zu groß, andere Dicke, anderes Material oder Maserung):
          </p>
          <ul className="mt-1 space-y-1">
            {shortage!.unfittable.map((p, i) => (
              <li key={i}>{itemQuantity(p)} × {describeItem(p)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
