// src/components/LinearStockTable.tsx
import InlineTable, { type Column, type Row, type CsvExportConfig, type CsvImportConfig } from './InlineTable'
import { useStore } from '../store'
import type { StockBar } from '../types'
import { parseLinearCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'label',    label: 'Bezeichnung', type: 'text', sortable: true },
  { key: 'length',   label: 'L',      type: 'number', width: '60px', sortable: true },
  { key: 'profile',  label: 'Profil', type: 'text',   width: '72px', sortable: true },
  { key: 'quantity', label: 'Anz',    type: 'number', width: '40px', csvLabel: 'Anzahl' },
  { key: 'price',    label: '€',      type: 'number', width: '52px', csvLabel: 'Preis' },
]

function toBars(rows: Record<string, unknown>[]): Array<Omit<StockBar, 'id'>> {
  return rows.map(r => ({
    label: String(r['name'] ?? ''),
    length: Number(r['length']),
    profile: String(r['profile'] ?? ''),
    quantity: Number(r['quantity']),
    price: Number(r['price']) || 0,
  }))
}

export default function LinearStockTable() {
  const stockBars = useStore(s => s.stockBars)
  const addStockBar = useStore(s => s.addStockBar)
  const updateStockBar = useStore(s => s.updateStockBar)
  const removeStockBar = useStore(s => s.removeStockBar)
  const replaceStockBars = useStore(s => s.replaceStockBars)
  const appendStockBars = useStore(s => s.appendStockBars)

  const rows: Row[] = stockBars.map(b => ({ ...b, price: b.price ?? 0 }))

  function handleSave(id: string, values: Record<string, unknown>) {
    updateStockBar(id, {
      label: String(values['label'] ?? ''),
      length: Math.max(1, Number(values['length']) || 0),
      profile: String(values['profile'] ?? '').trim(),
      quantity: Math.max(1, Number(values['quantity']) || 1),
      price: Number(values['price']) || 0,
    })
  }

  const csvExport: CsvExportConfig = { filename: 'stangenbestand.csv' }

  const csvImport: CsvImportConfig = {
    parseFile: (text: string) => {
      const result = parseLinearCsv(text)
      return { rows: result.rows.map(r => ({ ...r })), errors: result.errors }
    },
    onReplace: rows => replaceStockBars(toBars(rows)),
    onAppend: rows => appendStockBars(toBars(rows)),
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={() => addStockBar({ label: '', length: 6000, profile: '', quantity: 1, price: 0 })}
      onSave={handleSave}
      onDelete={removeStockBar}
      addLabel="+ Stange hinzufügen"
      csvExport={csvExport}
      csvImport={csvImport}
    />
  )
}
