// src/components/StockTable.tsx
import InlineTable, { type Row } from './InlineTable'
import { useStore } from '../store'
import type { StockPlate } from '../types'
import { itemColumns, grainExport, csvImportConfig, text, positive, nonNegative } from './itemColumns'

const COLUMNS = itemColumns({ grain: true, price: true })

export default function StockTable() {
  const stockPlates = useStore(s => s.stockPlates)
  const addStockPlate = useStore(s => s.addStockPlate)
  const updateStockPlate = useStore(s => s.updateStockPlate)
  const removeStockPlate = useStore(s => s.removeStockPlate)
  const replaceStockPlates = useStore(s => s.replaceStockPlates)
  const appendStockPlates = useStore(s => s.appendStockPlates)

  const rows: Row[] = stockPlates.map(p => ({
    id: p.id,
    pos: p.pos ?? '',
    name: p.label,
    material: p.material ?? '',
    quantity: p.quantity,
    width: p.width,
    thickness: p.thickness,
    length: p.height,
    grain: p.grain,
    price: p.price ?? 0,
  }))

  function handleSave(id: string, values: Record<string, unknown>) {
    updateStockPlate(id, {
      pos: text(values['pos']),
      label: text(values['name']),
      material: text(values['material']),
      quantity: positive(values['quantity'], 1),
      width: positive(values['width'], 0),
      thickness: positive(values['thickness'], 0),
      height: positive(values['length'], 0),
      grain: (values['grain'] as StockPlate['grain']) || 'any',
      price: nonNegative(values['price']),
    })
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateStockPlate(id, { grain: next as StockPlate['grain'] })
  }

  const csvImport = csvImportConfig<Omit<StockPlate, 'id'>>(
    r => ({
      pos: r.pos, label: r.name, material: r.material, quantity: r.quantity,
      width: r.width, thickness: r.thickness || 18, height: r.length, grain: r.grain, price: r.price,
    }),
    replaceStockPlates,
    appendStockPlates,
    { requireWidth: true },
  )

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={() => addStockPlate({ pos: '', label: '', material: '', quantity: 1, width: 800, thickness: 18, height: 600, grain: 'any', price: 0 })}
      onSave={handleSave}
      onDelete={removeStockPlate}
      addLabel="+ Platte hinzufügen"
      onGrainToggle={handleGrainToggle}
      csvExport={{ filename: 'plattenbestand.csv', grainExport }}
      csvImport={csvImport}
    />
  )
}
