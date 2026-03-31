// src/components/InlineTable.tsx
import { useState, useRef, useEffect } from 'react'

export interface Column {
  key: string
  label: string
  type: 'text' | 'number'
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
}

export default function InlineTable({
  columns,
  rows,
  onSave,
  onDelete,
  onAdd,
  addLabel = '+ Hinzufügen',
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
      values[col.key] = col.type === 'number'
        ? Math.max(0, Number(editValues[col.key] ?? 0))
        : editValues[col.key] ?? ''
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
                            <input
                              ref={colIndex === 0 ? firstInputRef : undefined}
                              type={col.type === 'number' ? 'number' : 'text'}
                              min={col.type === 'number' ? 0 : undefined}
                              value={editValues[col.key] ?? ''}
                              onChange={e => handleFieldChange(col.key, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{String(row[col.key] ?? '')}</span>
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
