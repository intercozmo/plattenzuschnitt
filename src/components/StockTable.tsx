// src/components/StockTable.tsx
import { useEffect, useRef } from 'react'
import InlineTable, { type Column, type Row } from './InlineTable'
import { useStore } from '../store'

const COLUMNS: Column[] = [
  { key: 'width', label: 'Breite (mm)', type: 'number', width: '90px' },
  { key: 'height', label: 'Länge (mm)', type: 'number', width: '90px' },
  { key: 'quantity', label: 'Anz.', type: 'number', width: '50px' },
  { key: 'label', label: 'Bezeichnung', type: 'text' },
]

export default function StockTable() {
  const stockPlates = useStore(s => s.stockPlates)
  const addStockPlate = useStore(s => s.addStockPlate)
  const updateStockPlate = useStore(s => s.updateStockPlate)
  const removeStockPlate = useStore(s => s.removeStockPlate)

  const prevLengthRef = useRef(stockPlates.length)

  // Track when a new plate is added so InlineTable can enter edit mode.
  // We use a ref to the InlineTable wrapper div and a key trick instead —
  // the simplest approach is to pass the rows and let InlineTable handle it.
  // The new row will be the last item after addStockPlate fires.
  useEffect(() => {
    prevLengthRef.current = stockPlates.length
  })

  const rows: Row[] = stockPlates.map(p => ({
    id: p.id,
    width: p.width,
    height: p.height,
    quantity: p.quantity,
    label: p.label,
  }))

  function handleAdd() {
    addStockPlate('', 800, 600, 1)
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateStockPlate(id, {
      width: Number(values['width']),
      height: Number(values['height']),
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
