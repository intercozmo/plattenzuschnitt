// src/components/LinearStockTable.tsx
import InlineTable, { type Row } from './InlineTable'
import { useStore } from '../store'
import type { StockBar } from '../types'
import { itemColumns, csvImportConfig, text, positive, nonNegative } from './itemColumns'

const COLUMNS = itemColumns({ price: true })

export default function LinearStockTable() {
  const stockBars = useStore(s => s.stockBars)
  const addStockBar = useStore(s => s.addStockBar)
  const updateStockBar = useStore(s => s.updateStockBar)
  const removeStockBar = useStore(s => s.removeStockBar)
  const replaceStockBars = useStore(s => s.replaceStockBars)
  const appendStockBars = useStore(s => s.appendStockBars)

  const rows: Row[] = stockBars.map(b => ({
    id: b.id,
    pos: b.pos ?? '',
    name: b.label,
    material: b.material,
    quantity: b.quantity,
    width: b.width,
    thickness: b.thickness,
    length: b.length,
    price: b.price ?? 0,
  }))

  function handleSave(id: string, values: Record<string, unknown>) {
    updateStockBar(id, {
      pos: text(values['pos']),
      label: text(values['name']),
      material: text(values['material']),
      quantity: positive(values['quantity'], 1),
      width: nonNegative(values['width']),
      thickness: nonNegative(values['thickness']),
      length: positive(values['length'], 0),
      price: nonNegative(values['price']),
    })
  }

  const csvImport = csvImportConfig<Omit<StockBar, 'id'>>(
    r => ({
      pos: r.pos, label: r.name, material: r.material, quantity: r.quantity,
      width: r.width, thickness: r.thickness, length: r.length, price: r.price,
    }),
    replaceStockBars,
    appendStockBars,
  )

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={() => addStockBar({ pos: '', label: '', material: '', quantity: 1, width: 0, thickness: 0, length: 6000, price: 0 })}
      onSave={handleSave}
      onDelete={removeStockBar}
      addLabel="+ Stange hinzufügen"
      csvExport={{ filename: 'stangenbestand.csv' }}
      csvImport={csvImport}
    />
  )
}
