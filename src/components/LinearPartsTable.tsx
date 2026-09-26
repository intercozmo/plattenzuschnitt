// src/components/LinearPartsTable.tsx
import InlineTable, { type Row } from './InlineTable'
import { useStore } from '../store'
import type { LinearPart } from '../types'
import { itemColumns, csvImportConfig, text, positive, nonNegative } from './itemColumns'

const COLUMNS = itemColumns()

export default function LinearPartsTable() {
  const linearParts = useStore(s => s.linearParts)
  const addLinearPart = useStore(s => s.addLinearPart)
  const updateLinearPart = useStore(s => s.updateLinearPart)
  const removeLinearPart = useStore(s => s.removeLinearPart)
  const replaceLinearParts = useStore(s => s.replaceLinearParts)
  const appendLinearParts = useStore(s => s.appendLinearParts)

  const rows: Row[] = linearParts.map(p => ({ ...p, pos: p.pos ?? '' }))

  function handleAdd() {
    // New parts default to the cross-section and material of the first bar
    const bar = useStore.getState().stockBars[0]
    addLinearPart({
      pos: '', name: '', quantity: 1, length: 1000,
      material: bar?.material ?? '', width: bar?.width ?? 0, thickness: bar?.thickness ?? 0,
    })
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateLinearPart(id, {
      pos: text(values['pos']),
      name: text(values['name']) || 'Teil',
      material: text(values['material']),
      quantity: positive(values['quantity'], 1),
      width: nonNegative(values['width']),
      thickness: nonNegative(values['thickness']),
      length: positive(values['length'], 0),
    })
  }

  const csvImport = csvImportConfig<Omit<LinearPart, 'id'>>(
    r => ({
      pos: r.pos, name: r.name, material: r.material, quantity: r.quantity,
      width: r.width, thickness: r.thickness, length: r.length,
    }),
    replaceLinearParts,
    appendLinearParts,
  )

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={removeLinearPart}
      addLabel="+ Teil hinzufügen"
      csvExport={{ filename: 'teileliste.csv' }}
      csvImport={csvImport}
    />
  )
}
