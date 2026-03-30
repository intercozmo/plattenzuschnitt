// src/components/StockTable.tsx
import InlineTable, { type Column, type Row } from './InlineTable'
import { useStore } from '../store'

const COLUMNS: Column[] = [
  { key: 'width',     label: 'B',    type: 'number', width: '52px' },
  { key: 'height',    label: 'L',    type: 'number', width: '52px' },
  { key: 'thickness', label: 'D',    type: 'number', width: '40px' },
  { key: 'quantity',  label: 'Anz',  type: 'number', width: '40px' },
  { key: 'label',     label: 'Bezeichnung', type: 'text' },
]

export default function StockTable() {
  const stockPlates = useStore(s => s.stockPlates)
  const addStockPlate = useStore(s => s.addStockPlate)
  const updateStockPlate = useStore(s => s.updateStockPlate)
  const removeStockPlate = useStore(s => s.removeStockPlate)

  const rows: Row[] = stockPlates.map(p => ({
    id: p.id,
    width: p.width,
    height: p.height,
    thickness: p.thickness,
    quantity: p.quantity,
    label: p.label,
  }))

  function handleAdd() {
    addStockPlate('', 800, 600, 18, 1)
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    const width = Math.max(1, Number(values['width']) || 0)
    const height = Math.max(1, Number(values['height']) || 0)
    const thickness = Math.max(1, Number(values['thickness']) || 0)
    updateStockPlate(id, {
      width,
      height,
      thickness,
      quantity: Number(values['quantity']),
      label: String(values['label'] ?? ''),
    })
  }

  function handleDelete(id: string) {
    removeStockPlate(id)
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
      addLabel="+ Platte hinzufügen"
    />
  )
}
