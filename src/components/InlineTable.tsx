// src/components/InlineTable.tsx
import { useState, useRef, useEffect, useMemo } from 'react'

export interface Column {
  key: string
  label: string
  type: 'text' | 'number' | 'grain'
  width?: string
  sortable?: boolean
  csvLabel?: string   // overrides label in CSV export headers
}

export interface Row {
  id: string
  [key: string]: unknown
}

export interface CsvExportConfig {
  filename: string
  grainExport?: (g: string) => string
}

interface Props {
  columns: Column[]
  rows: Row[]
  onSave: (id: string, values: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onAdd: () => void
  addLabel?: string
  onGrainToggle?: (id: string, currentGrain: string) => void
  csvExport?: CsvExportConfig
}

function grainLabel(grain: string): string {
  if (grain === 'horizontal') return '→'
  if (grain === 'vertical') return '↓'
  return '↔'
}

function grainTitle(grain: string): string {
  if (grain === 'horizontal') return 'Längs'
  if (grain === 'vertical') return 'Quer'
  return 'Keine'
}

export default function InlineTable({
  columns,
  rows,
  onSave,
  onDelete,
  onAdd,
  addLabel = '+ Hinzufügen',
  onGrainToggle,
  csvExport,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string'
        ? String(av).localeCompare(String(bv))
        : Number(av) - Number(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    if (editingId !== null) {
      firstInputRef.current?.focus()
    }
  }, [editingId])

  // Auto-start editing when a new row appears (rows.length increased)
  const prevLengthRef = useRef(rows.length)
  useEffect(() => {
    if (rows.length > prevLengthRef.current) {
      const newest = rows[rows.length - 1]
      if (newest) startEdit(newest)
    }
    prevLengthRef.current = rows.length
  })

  function startEdit(row: Row) {
    if (editingId !== null && editingId !== row.id) {
      commitSave(editingId)
    }
    const initial: Record<string, string> = {}
    for (const col of columns) {
      initial[col.key] = String(row[col.key] ?? '')
    }
    setEditingId(row.id)
    setEditValues(initial)
  }

  function commitSave(id: string) {
    const values: Record<string, unknown> = {}
    for (const col of columns) {
      if (col.type === 'number') {
        values[col.key] = Math.max(0, Number(editValues[col.key] ?? 0))
      } else if (col.type === 'grain') {
        values[col.key] = editValues[col.key] ?? 'any'
      } else {
        values[col.key] = editValues[col.key] ?? ''
      }
    }
    onSave(id, values)
    setEditingId(null)
    setEditValues({})
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  function handleCsvExport() {
    if (!csvExport) return
    const grainFn = csvExport.grainExport ?? ((g: string) => g)
    const header = columns.map(c => c.csvLabel ?? c.label).join(';')
    const dataRows = rows.map(row =>
      columns.map(col => {
        const val = row[col.key]
        if (col.type === 'grain') return grainFn(String(val ?? ''))
        return String(val ?? '')
      }).join(';')
    )
    const csv = [header, ...dataRows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvExport.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string, colIndex: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitSave(id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    } else if (e.key === 'Tab' && !e.shiftKey && colIndex === columns.length - 1) {
      e.preventDefault()
      const idx = sortedRows.findIndex(r => r.id === id)
      const nextRow = sortedRows[idx + 1]
      commitSave(id)
      if (nextRow) {
        const initial: Record<string, string> = {}
        for (const col of columns) initial[col.key] = String(nextRow[col.key] ?? '')
        setTimeout(() => { setEditingId(nextRow.id); setEditValues(initial) }, 0)
      }
    } else if (e.key === 'Tab' && e.shiftKey && colIndex === 0) {
      e.preventDefault()
      const idx = sortedRows.findIndex(r => r.id === id)
      const prevRow = sortedRows[idx - 1]
      commitSave(id)
      if (prevRow) {
        const initial: Record<string, string> = {}
        for (const col of columns) initial[col.key] = String(prevRow[col.key] ?? '')
        setTimeout(() => { setEditingId(prevRow.id); setEditValues(initial) }, 0)
      }
    }
  }

  function handleFieldChange(key: string, value: string) {
    setEditValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="w-full">
      {rows.length === 0 ? (
        <p className="text-slate-400 text-sm py-2 text-center">Keine Einträge vorhanden.</p>
      ) : (
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  {columns.map(col => (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      className={`text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100 select-none${col.sortable ? ' cursor-pointer hover:bg-slate-200' : ''}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      {col.label}{col.sortable && sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                  {/* actions column */}
                  <th className="w-8 border border-slate-300 bg-slate-100" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, rowIndex) => {
                  const isEditing = editingId === row.id
                  return (
                    <tr
                      key={row.id}
                      className={`${isEditing ? 'bg-blue-50' : (rowIndex % 2 === 0 ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'bg-slate-50 hover:bg-blue-50 cursor-pointer')}`}
                      onClick={() => { if (!isEditing) startEdit(row) }}
                      tabIndex={isEditing ? -1 : 0}
                      onKeyDown={e => {
                        if (!isEditing) {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(row) }
                          else if (e.key === 'ArrowDown') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement)?.focus() }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); (e.currentTarget.previousElementSibling as HTMLElement)?.focus() }
                        }
                      }}
                    >
                      {columns.map((col, colIndex) => (
                        <td key={col.key} className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            col.type === 'grain' ? (
                              <select
                                value={editValues[col.key] ?? 'any'}
                                onChange={e => handleFieldChange(col.key, e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row.id, colIndex)}
                                className="bg-white text-slate-800 border-0 outline-none w-full text-sm py-0.5"
                              >
                                <option value="any">Keine</option>
                                <option value="horizontal">Längs</option>
                                <option value="vertical">Quer</option>
                              </select>
                            ) : (
                              <input
                                ref={colIndex === 0 ? firstInputRef : undefined}
                                type={col.type === 'number' ? 'number' : 'text'}
                                min={col.type === 'number' ? 0 : undefined}
                                value={editValues[col.key] ?? ''}
                                onChange={e => handleFieldChange(col.key, e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row.id, colIndex)}
                                onFocus={e => e.target.select()}
                                className="w-full bg-white text-slate-800 border-0 outline-none px-1 py-0.5 text-sm"
                              />
                            )
                          ) : (
                            col.type === 'grain' ? (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onGrainToggle?.(row.id, String(row[col.key])) }}
                                title={grainTitle(String(row[col.key]))}
                                className="text-slate-700 text-sm px-1"
                              >
                                {grainLabel(String(row[col.key]))}
                              </button>
                            ) : (
                              <span className="text-slate-700">{String(row[col.key] ?? '')}</span>
                            )
                          )}
                        </td>
                      ))}
                      <td className="py-1 px-1 text-right border border-slate-200" onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => commitSave(row.id)}
                              className="text-green-600 hover:text-green-700 text-xs px-1 font-medium"
                              title="Speichern"
                              aria-label="Speichern"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-slate-400 hover:text-slate-600 text-xs px-1"
                              title="Abbrechen"
                              aria-label="Abbrechen"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDelete(row.id)}
                            className="text-slate-400 hover:text-red-500 text-xs px-1 transition-colors"
                            title="Löschen"
                            aria-label="Löschen"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {addLabel}
      </button>
      {csvExport && rows.length > 0 && (
        <button
          type="button"
          onClick={handleCsvExport}
          className="mt-2 ml-3 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          CSV exportieren
        </button>
      )}
    </div>
  )
}
