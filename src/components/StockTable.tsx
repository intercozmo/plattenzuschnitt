// src/components/StockTable.tsx
import InlineTable, { type Column, type Row, type CsvExportConfig, type CsvImportConfig } from './InlineTable'
import { useStore } from '../store'
import type { StockPlate } from '../types'
import { parseStockCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'label',     label: 'Bezeichnung', type: 'text', sortable: true },
  { key: 'height',    label: 'L',    type: 'number', width: '52px', sortable: true },
  { key: 'width',     label: 'B',    type: 'number', width: '52px', sortable: true },
  { key: 'thickness', label: 'D',    type: 'number', width: '40px' },
  { key: 'grain',     label: 'M',    type: 'grain' as const, width: '40px', csvLabel: 'Maserung' },
  { key: 'quantity',  label: 'Anz',  type: 'number', width: '40px', sortable: true, csvLabel: 'Anzahl' },
]

export default function StockTable() {
  const stockPlates = useStore(s => s.stockPlates)
  const addStockPlate = useStore(s => s.addStockPlate)
  const updateStockPlate = useStore(s => s.updateStockPlate)
  const removeStockPlate = useStore(s => s.removeStockPlate)
  const replaceStockPlates = useStore(s => s.replaceStockPlates)
  const appendStockPlates = useStore(s => s.appendStockPlates)

  const rows: Row[] = stockPlates.map(p => ({
    id: p.id,
    width: p.width,
    height: p.height,
    thickness: p.thickness,
    grain: p.grain,
    quantity: p.quantity,
    label: p.label,
  }))

  function handleAdd() {
    addStockPlate('', 800, 600, 18, 'any', 1)
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    const width = Math.max(1, Number(values['width']) || 0)
    const height = Math.max(1, Number(values['height']) || 0)
    const thickness = Math.max(1, Number(values['thickness']) || 0)
    updateStockPlate(id, {
      width,
      height,
      thickness,
      grain: (values['grain'] as string || 'any') as StockPlate['grain'],
      quantity: Number(values['quantity']),
      label: String(values['label'] ?? ''),
    })
  }

  function handleDelete(id: string) {
    removeStockPlate(id)
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateStockPlate(id, { grain: next as StockPlate['grain'] })
  }

  const csvExport: CsvExportConfig = {
    filename: 'plattenbestand.csv',
    grainExport: (g: string) => {
      if (g === 'horizontal') return 'Längs'
      if (g === 'vertical') return 'Quer'
      return ''
    },
  }

  const csvImport: CsvImportConfig = {
    parseFile: (text: string) => {
      const result = parseStockCsv(text)
      return {
        rows: result.plates.map(p => ({ ...p })),
        errors: result.errors,
      }
    },
    onReplace: (importedRows) => {
      replaceStockPlates(importedRows.map(r => ({
        label: String(r['label'] ?? ''),
        width: Number(r['width']),
        height: Number(r['height']),
        thickness: Number(r['thickness']),
        grain: (r['grain'] as StockPlate['grain']) ?? 'any',
        quantity: Number(r['quantity']),
      })))
    },
    onAppend: (importedRows) => {
      appendStockPlates(importedRows.map(r => ({
        label: String(r['label'] ?? ''),
        width: Number(r['width']),
        height: Number(r['height']),
        thickness: Number(r['thickness']),
        grain: (r['grain'] as StockPlate['grain']) ?? 'any',
        quantity: Number(r['quantity']),
      })))
    },
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
      addLabel="+ Platte hinzufügen"
      onGrainToggle={handleGrainToggle}
      csvExport={csvExport}
      csvImport={csvImport}
    />
  )
}
