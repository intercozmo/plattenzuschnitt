// src/components/PiecesTable.tsx
import InlineTable, { type Row } from './InlineTable'
import { useStore } from '../store'
import type { CutPiece } from '../types'
import { itemColumns, grainExport, csvImportConfig, text, positive } from './itemColumns'

const COLUMNS = itemColumns({ grain: true })

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
    pos: p.pos ?? '',
    name: p.name,
    material: p.material ?? '',
    quantity: p.quantity,
    width: p.width,
    thickness: p.thickness,
    length: p.height,
    grain: p.grain,
  }))

  function handleAdd() {
    // New pieces default to the material and thickness of the first plate
    const plate = useStore.getState().stockPlates[0]
    addCutPiece({ pos: '', name: '', material: plate?.material ?? '', quantity: 1, width: 400, thickness: plate?.thickness ?? 18, height: 300, grain: 'any' })
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateCutPiece(id, {
      pos: text(values['pos']),
      name: text(values['name']) || 'Teil',
      material: text(values['material']),
      quantity: positive(values['quantity'], 1),
      width: positive(values['width'], 0),
      thickness: positive(values['thickness'], 0),
      height: positive(values['length'], 0),
      grain: (values['grain'] as CutPiece['grain']) || 'any',
    })
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateCutPiece(id, { grain: next as CutPiece['grain'] })
  }

  const csvExport = { filename: 'stückliste.csv', grainExport }

  const csvImport = csvImportConfig<Omit<CutPiece, 'id'>>(
    r => ({
      pos: r.pos, name: r.name, material: r.material, quantity: r.quantity,
      width: r.width, thickness: r.thickness || 18, height: r.length, grain: r.grain,
    }),
    replaceCutPieces,
    appendCutPieces,
    { requireWidth: true },
  )

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
