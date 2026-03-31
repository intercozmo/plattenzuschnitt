// src/components/InlineTable.tsx
import { useState, useRef, useEffect } from 'react'

export interface Column {
  key: string
  label: string
  type: 'text' | 'number' | 'grain'
  width?: string
}

export interface Row {
  id: string
  [key: string]: unknown
}

interface Props {
  columns: Column[]
  rows: Row[]
  onSave: (id: string, values: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onAdd: () => void
  addLabel?: string
  onGrainToggle?: (id: string, currentGrain: string) => void
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
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId !== null) {
      firstInputRef.current?.focus()
    }
  }, [editingId])

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

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitSave(id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
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
                      className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100"
                    >
                      {col.label}
                    </th>
                  ))}
                  {/* actions column */}
                  <th className="w-8 border border-slate-300 bg-slate-100" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const isEditing = editingId === row.id
                  return (
                    <tr
                      key={row.id}
                      className={`${isEditing ? 'bg-blue-50' : (rowIndex % 2 === 0 ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'bg-slate-50 hover:bg-blue-50 cursor-pointer')}`}
                      onClick={() => { if (!isEditing) startEdit(row) }}
                      tabIndex={isEditing ? -1 : 0}
                      onKeyDown={e => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(row) } }}
                    >
                      {columns.map((col, colIndex) => (
                        <td key={col.key} className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            col.type === 'grain' ? (
                              <select
                                value={editValues[col.key] ?? 'any'}
                                onChange={e => handleFieldChange(col.key, e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row.id)}
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
                                onKeyDown={e => handleKeyDown(e, row.id)}
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
    </div>
  )
}
