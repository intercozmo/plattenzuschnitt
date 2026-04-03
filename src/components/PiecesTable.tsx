// src/components/PiecesTable.tsx
import InlineTable, { type Column, type Row, type CsvExportConfig, type CsvImportConfig } from './InlineTable'
import { useStore } from '../store'
import type { CutPiece } from '../types'
import { parseCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'name',      label: 'Name',  type: 'text',   sortable: true },
  { key: 'height',    label: 'L',     type: 'number', width: '52px', sortable: true },
  { key: 'width',     label: 'B',     type: 'number', width: '52px', sortable: true },
  { key: 'thickness', label: 'D',     type: 'number', width: '40px' },
  { key: 'grain',     label: 'M',     type: 'grain' as const, width: '40px', csvLabel: 'Maserung' },
  { key: 'quantity',  label: 'Anz',   type: 'number', width: '40px', sortable: true, csvLabel: 'Anzahl' },
]

export default function PiecesTable() {
  const cutPieces = useStore(s => s.cutPieces)
  const addCutPiece = useStore(s => s.addCutPiece)
  const updateCutPiece = useStore(s => s.updateCutPiece)
  const removeCutPiece = useStore(s => s.removeCutPiece)
  const replaceCutPieces = useStore(s => s.replaceCutPieces)
  const appendCutPieces = useStore(s => s.appendCutPieces)

  const rows: Row[] = cutPieces.map(p => ({
    id: p.id,
    name: p.name,
    width: p.width,
    height: p.height,
    thickness: p.thickness,
    grain: p.grain,
    quantity: p.quantity,
  }))

  function handleAdd() {
    addCutPiece('', 400, 300, 18, 1, 'any')
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateCutPiece(id, {
      name: String(values['name'] ?? '').trim() || 'Teil',
      width: Math.max(1, Number(values['width']) || 0),
      height: Math.max(1, Number(values['height']) || 0),
      thickness: Math.max(1, Number(values['thickness']) || 0),
      quantity: Math.max(1, Number(values['quantity']) || 1),
      grain: (values['grain'] as CutPiece['grain']) ?? 'any',
    })
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateCutPiece(id, { grain: next as CutPiece['grain'] })
  }

  const csvExport: CsvExportConfig = {
    filename: 'stückliste.csv',
    grainExport: (g: string) => {
      if (g === 'horizontal') return 'Längs'
      if (g === 'vertical') return 'Quer'
      return ''
    },
  }

  const csvImport: CsvImportConfig = {
    parseFile: (text: string) => {
      const result = parseCsv(text)
      return {
        rows: result.pieces.map(p => ({ ...p })),
        errors: result.errors,
      }
    },
    onReplace: (importedRows) => {
      replaceCutPieces(importedRows.map(r => ({
        name: String(r['name'] ?? ''),
        width: Number(r['width']),
        height: Number(r['height']),
        thickness: Number(r['thickness']),
        grain: (r['grain'] as CutPiece['grain']) ?? 'any',
        quantity: Number(r['quantity']),
      })))
    },
    onAppend: (importedRows) => {
      appendCutPieces(importedRows.map(r => ({
        name: String(r['name'] ?? ''),
        width: Number(r['width']),
        height: Number(r['height']),
        thickness: Number(r['thickness']),
        grain: (r['grain'] as CutPiece['grain']) ?? 'any',
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
      onDelete={removeCutPiece}
      addLabel="+ Stück hinzufügen"
      onGrainToggle={handleGrainToggle}
      csvExport={csvExport}
      csvImport={csvImport}
    />
  )
}
