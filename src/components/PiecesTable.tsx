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
  const useInlineTableForPieces = useStore(s => s.useInlineTableForPieces)
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

  // Phase 1: render InlineTable behind feature flag; else render a lightweight fallback table
  if (useInlineTableForPieces) {
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

  // Lightweight fallback UI when feature flag is off
  return (
    <div className="rounded border border-slate-300 p-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            {COLUMNS.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined} className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300">
                {col.label}
              </th>
            ))}
            <th className="w-8 border border-slate-300 bg-slate-100" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-200">
              {COLUMNS.map(col => (
                <td key={col.key} className="py-1 px-2 border border-slate-200">{String(r[col.key] ?? '')}</td>
              ))}
              <td className="py-1 px-1 text-right border border-slate-200" />
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={handleAdd} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Stück hinzufügen</button>
    </div>
  )
}
