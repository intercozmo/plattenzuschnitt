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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className="text-left text-slate-500 font-medium py-2 pr-3 last:pr-0"
                  >
                    {col.label}
                  </th>
                ))}
                {/* actions column */}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row.id
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 last:border-0 ${isEditing ? 'bg-blue-50' : 'hover:bg-slate-50 cursor-pointer'}`}
                    onClick={() => { if (!isEditing) startEdit(row) }}
                    tabIndex={isEditing ? -1 : 0}
                    onKeyDown={e => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(row) } }}
                  >
                    {columns.map((col, colIndex) => (
                      <td key={col.key} className="py-2 pr-3 last:pr-0" onClick={e => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <input
                            ref={colIndex === 0 ? firstInputRef : undefined}
                            type={col.type === 'number' ? 'number' : 'text'}
                            min={col.type === 'number' ? 0 : undefined}
                            value={editValues[col.key] ?? ''}
                            onChange={e => handleFieldChange(col.key, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, row.id)}
                            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="text-slate-700">{String(row[col.key] ?? '')}</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2 text-right" onClick={e => e.stopPropagation()}>
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
