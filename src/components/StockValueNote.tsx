// src/components/StockValueNote.tsx
// Total value of the stock below a stock table (only when prices are set)
import { stockValue, formatEuro } from '../utils/items'

interface Props {
  items: Array<{ quantity: number; price?: number }>
  unit: [string, string]  // singular, plural, e.g. ['Platte', 'Platten']
}

export default function StockValueNote({ items, unit }: Props) {
  const value = stockValue(items)
  if (value <= 0) return null
  const count = items.reduce((s, i) => s + i.quantity, 0)
  return (
    <p className="mt-2 text-sm text-slate-600">
      Bestandswert: <span className="font-medium text-slate-800">{formatEuro(value)}</span>
      {' '}({count} {count === 1 ? unit[0] : unit[1]})
    </p>
  )
}
