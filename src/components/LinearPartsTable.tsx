// src/components/LinearPartsTable.tsx
import InlineTable, { type Column, type Row, type CsvExportConfig, type CsvImportConfig } from './InlineTable'
import { useStore } from '../store'
import type { LinearPart } from '../types'
import { parseLinearCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'name',     label: 'Name',   type: 'text',   sortable: true },
  { key: 'length',   label: 'L',      type: 'number', width: '60px', sortable: true },
  { key: 'profile',  label: 'Profil', type: 'text',   width: '72px', sortable: true },
  { key: 'quantity', label: 'Anz',    type: 'number', width: '40px', sortable: true, csvLabel: 'Anzahl' },
]

function toParts(rows: Record<string, unknown>[]): Array<Omit<LinearPart, 'id'>> {
  return rows.map(r => ({
    name: String(r['name'] ?? ''),
    length: Number(r['length']),
    profile: String(r['profile'] ?? ''),
    quantity: Number(r['quantity']),
  }))
}

export default function LinearPartsTable() {
  const linearParts = useStore(s => s.linearParts)
  const addLinearPart = useStore(s => s.addLinearPart)
  const updateLinearPart = useStore(s => s.updateLinearPart)
  const removeLinearPart = useStore(s => s.removeLinearPart)
  const replaceLinearParts = useStore(s => s.replaceLinearParts)
  const appendLinearParts = useStore(s => s.appendLinearParts)

  const rows: Row[] = linearParts.map(p => ({ ...p }))

  function handleAdd() {
    // New parts default to the profile of the first bar, the common single-profile case
    const profile = useStore.getState().stockBars[0]?.profile ?? ''
    addLinearPart({ name: '', length: 1000, profile, quantity: 1 })
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateLinearPart(id, {
      name: String(values['name'] ?? '').trim() || 'Teil',
      length: Math.max(1, Number(values['length']) || 0),
      profile: String(values['profile'] ?? '').trim(),
      quantity: Math.max(1, Number(values['quantity']) || 1),
    })
  }

  const csvExport: CsvExportConfig = { filename: 'teileliste.csv' }

  const csvImport: CsvImportConfig = {
    parseFile: (text: string) => {
      const result = parseLinearCsv(text)
      return { rows: result.rows.map(r => ({ ...r })), errors: result.errors }
    },
    onReplace: rows => replaceLinearParts(toParts(rows)),
    onAppend: rows => appendLinearParts(toParts(rows)),
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={removeLinearPart}
      addLabel="+ Teil hinzufügen"
      csvExport={csvExport}
      csvImport={csvImport}
    />
  )
}
