// src/components/PiecesTable.tsx
import { useState, useRef, useEffect, useId, useMemo } from 'react'
import { useStore } from '../store'
import type { Grain, CutPiece } from '../types'
import { parseCsv } from '../utils/csvImport'
import type { CsvPiece } from '../utils/csvImport'

type GrainValue = CutPiece['grain']
type SortKey = 'width' | 'height' | 'quantity' | 'name'
type SortDir = 'asc' | 'desc'

function grainLabel(grain: GrainValue): string {
  if (grain === 'horizontal') return '→'
  if (grain === 'vertical') return '↓'
  return '↔'
}

function grainTitle(grain: GrainValue): string {
  if (grain === 'horizontal') return 'Längs'
  if (grain === 'vertical') return 'Quer'
  return 'Keine'
}

function nextGrain(grain: GrainValue): GrainValue {
  if (grain === 'any') return 'horizontal'
  if (grain === 'horizontal') return 'vertical'
  return 'any'
}

interface EditValues {
  width: string
  height: string
  thickness: string
  quantity: string
  name: string
  grain: GrainValue
}

export default function PiecesTable() {
  const cutPieces = useStore(s => s.cutPieces)
  const addCutPiece = useStore(s => s.addCutPiece)
  const updateCutPiece = useStore(s => s.updateCutPiece)
  const removeCutPiece = useStore(s => s.removeCutPiece)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues>({ width: '', height: '', thickness: '', quantity: '', name: '', grain: 'any' })
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [pendingImport, setPendingImport] = useState<CsvPiece[] | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const firstInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()

  useEffect(() => {
    if (editingId !== null) {
      firstInputRef.current?.focus()
    }
  }, [editingId])

  // When cutPieces length increases, automatically start editing the last (newest) piece
  const prevLengthRef = useRef(cutPieces.length)
  useEffect(() => {
    if (cutPieces.length > prevLengthRef.current) {
      const newest = cutPieces[cutPieces.length - 1]
      if (newest) {
        startEdit(newest)
      }
    }
    prevLengthRef.current = cutPieces.length
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedPieces = useMemo(() => {
    if (!sortKey) return cutPieces
    return [...cutPieces].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [cutPieces, sortKey, sortDir])

  function startEdit(piece: CutPiece) {
    if (editingId !== null && editingId !== piece.id) {
      // editValues still holds the prior row's data from this render snapshot — safe to commit
      commitSave(editingId)
    }
    setEditingId(piece.id)
    setEditValues({
      width: String(piece.width),
      height: String(piece.height),
      thickness: String(piece.thickness),
      quantity: String(piece.quantity),
      name: piece.name,
      grain: piece.grain,
    })
  }

  function commitSave(id: string) {
    const name = (String(editValues.name ?? '')).trim() || 'Teil'
    updateCutPiece(id, {
      width: Math.max(1, Number(editValues.width) || 0),
      height: Math.max(1, Number(editValues.height) || 0),
      thickness: Math.max(1, Number(editValues.thickness) || 0),
      quantity: Math.max(1, Number(editValues.quantity) || 1),
      name,
      grain: editValues.grain,
    })
    setEditingId(null)
    setEditValues({ width: '', height: '', thickness: '', quantity: '', name: '', grain: 'any' })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({ width: '', height: '', thickness: '', quantity: '', name: '', grain: 'any' })
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

  function handleAdd() {
    addCutPiece('', 400, 300, 18, 1, 'any')
  }

  function toggleGrainInReadMode(piece: CutPiece, e: React.MouseEvent) {
    e.stopPropagation()
    updateCutPiece(piece.id, { grain: nextGrain(piece.grain) })
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      setImportErrors(result.errors)
      if (result.pieces.length > 0) {
        setPendingImport(result.pieces)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleCsvFile(file)
    // Reset input so same file can be re-imported
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }

  function handleDragLeave() { setIsDragOver(false) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    handleCsvFile(file)
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded transition-all ${isDragOver ? 'outline-2 outline-dashed outline-blue-400 bg-blue-50' : ''}`}
      >
        {cutPieces.length === 0 ? (
          <p className="text-slate-400 text-sm py-2 text-center">Keine Einträge vorhanden.</p>
        ) : (
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th
                      style={{ width: '52px' }}
                      className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100 cursor-pointer select-none hover:bg-slate-200"
                      onClick={() => handleSort('width')}
                    >
                      B {sortKey === 'width' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      style={{ width: '52px' }}
                      className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100 cursor-pointer select-none hover:bg-slate-200"
                      onClick={() => handleSort('height')}
                    >
                      L {sortKey === 'height' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ width: '52px' }} className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100">D</th>
                    <th
                      style={{ width: '40px' }}
                      className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100 cursor-pointer select-none hover:bg-slate-200"
                      onClick={() => handleSort('quantity')}
                    >
                      Anz {sortKey === 'quantity' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100 cursor-pointer select-none hover:bg-slate-200"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th style={{ width: '52px' }} className="text-left text-slate-600 font-semibold py-1 px-2 border border-slate-300 bg-slate-100">M</th>
                    <th className="w-8 border border-slate-300 bg-slate-100" />
                  </tr>
                </thead>
                <tbody>
                  {sortedPieces.map((piece, rowIndex) => {
                    const isEditing = editingId === piece.id
                    return (
                      <tr
                        key={piece.id}
                        className={`${isEditing ? 'bg-blue-50' : (rowIndex % 2 === 0 ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'bg-slate-50 hover:bg-blue-50 cursor-pointer')}`}
                        onClick={() => { if (!isEditing) startEdit(piece) }}
                        tabIndex={isEditing ? -1 : 0}
                        onKeyDown={e => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(piece) } }}
                      >
                        {/* width */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              ref={firstInputRef}
                              type="number"
                              min={1}
                              value={editValues.width}
                              onChange={e => setEditValues(v => ({ ...v, width: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, piece.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{piece.width}</span>
                          )}
                        </td>
                        {/* height */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editValues.height}
                              onChange={e => setEditValues(v => ({ ...v, height: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, piece.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{piece.height}</span>
                          )}
                        </td>
                        {/* thickness */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editValues.thickness}
                              onChange={e => setEditValues(v => ({ ...v, thickness: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, piece.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{piece.thickness}</span>
                          )}
                        </td>
                        {/* quantity */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editValues.quantity}
                              onChange={e => setEditValues(v => ({ ...v, quantity: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, piece.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{piece.quantity}</span>
                          )}
                        </td>
                        {/* name */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.name}
                              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, piece.id)}
                              onFocus={e => e.target.select()}
                              className="w-full bg-white text-slate-800 border border-blue-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="text-slate-700">{piece.name}</span>
                          )}
                        </td>
                        {/* grain */}
                        <td className="py-1 px-2 border border-slate-200" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <select
                              value={editValues.grain}
                              onChange={e => setEditValues(v => ({ ...v, grain: e.target.value as GrainValue }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSave(piece.id) } else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() } }}
                              className="w-full border border-blue-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                              <option value="any">Keine</option>
                              <option value="horizontal">Längs</option>
                              <option value="vertical">Quer</option>
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={e => toggleGrainInReadMode(piece, e)}
                              title={grainTitle(piece.grain)}
                              aria-label={`Maserung: ${grainTitle(piece.grain)}`}
                              className="text-slate-600 hover:text-blue-600 text-base w-8 h-7 flex items-center justify-center rounded hover:bg-blue-50 transition-colors"
                            >
                              {grainLabel(piece.grain)}
                            </button>
                          )}
                        </td>
                        {/* actions */}
                        <td className="py-1 px-1 text-right border border-slate-200" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => commitSave(piece.id)}
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
                              onClick={() => removeCutPiece(piece.id)}
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
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        + Stück hinzufügen
      </button>

      {/* CSV Import */}
      <div className="mt-2">
        <label
          htmlFor={fileInputId}
          className="inline-block text-sm text-slate-500 hover:text-slate-700 cursor-pointer underline underline-offset-2"
        >
          CSV importieren
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvImport}
          className="sr-only"
        />
      </div>

      {pendingImport && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800 font-medium mb-2">
            {pendingImport.length} Stück erkannt. Bestehende Stücke ersetzen oder hinzufügen?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                cutPieces.forEach(p => removeCutPiece(p.id))
                pendingImport.forEach(p => addCutPiece(p.name, p.width, p.height, p.thickness, p.quantity, p.grain as Grain))
                setPendingImport(null)
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
            >
              Ersetzen
            </button>
            <button
              type="button"
              onClick={() => {
                pendingImport.forEach(p => addCutPiece(p.name, p.width, p.height, p.thickness, p.quantity, p.grain as Grain))
                setPendingImport(null)
              }}
              className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-xs font-medium hover:bg-blue-50"
            >
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="px-3 py-1 text-slate-500 text-xs hover:text-slate-700"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {importErrors.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <p className="font-medium mb-1">Import-Warnungen:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {importErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
