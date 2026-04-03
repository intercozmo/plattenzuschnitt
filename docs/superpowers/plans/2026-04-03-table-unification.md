# Table Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `InlineTable` with sorting, CSV import/export, auto-edit for new rows, and drag-drop; then replace `PiecesTable`'s 510 custom lines with `InlineTable` and wire up the same features in `StockTable`.

**Architecture:** All new features go into `InlineTable` as optional props (`sortable` on `Column`, `csvExport`, `csvImport`). `StockTable` and `PiecesTable` remain thin wrappers that configure `InlineTable`. A new `parseStockCsv` function is added to `csvImport.ts` by wrapping the existing `parseCsv`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest (algorithm tests only — no component test harness)

---

### Task 1: Add column sorting to InlineTable

**Files:**
- Modify: `src/components/InlineTable.tsx`

- [ ] **Step 1: Add `sortable` and `csvLabel` fields to the `Column` interface and extend React imports**

In `src/components/InlineTable.tsx`, replace the first two lines:

```tsx
import { useState, useRef, useEffect } from 'react'

export interface Column {
  key: string
  label: string
  type: 'text' | 'number' | 'grain'
  width?: string
}
```

With:

```tsx
import { useState, useRef, useEffect, useMemo, useId } from 'react'

export interface Column {
  key: string
  label: string
  type: 'text' | 'number' | 'grain'
  width?: string
  sortable?: boolean
  csvLabel?: string   // overrides label in CSV export headers
}
```

- [ ] **Step 2: Add sort state and `sortedRows` computation inside the component**

After the line `const firstInputRef = useRef<HTMLInputElement>(null)`, add:

```tsx
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
```

- [ ] **Step 3: Update `<thead>` to show sort indicator and handle click**

Replace the `{columns.map(col => (<th ...>` block inside `<thead>` with:

```tsx
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
```

- [ ] **Step 4: Use `sortedRows` in the tbody and Tab navigation**

In the `<tbody>` section, replace `rows.map((row, rowIndex) =>` with `sortedRows.map((row, rowIndex) =>`.

In the `handleKeyDown` function, replace both `rows.findIndex` calls with `sortedRows.findIndex` and both `rows[idx + 1]`/`rows[idx - 1]` with `sortedRows[idx + 1]`/`sortedRows[idx - 1]`:

```typescript
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
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: No TypeScript or Vite errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/InlineTable.tsx
git commit -m "feat: add column sorting to InlineTable"
```

---

### Task 2: Add auto-edit for new rows to InlineTable

**Files:**
- Modify: `src/components/InlineTable.tsx`

- [ ] **Step 1: Add the auto-edit effect**

After the existing `useEffect(() => { if (editingId !== null) { firstInputRef.current?.focus() } }, [editingId])` block, add:

```tsx
  // Auto-start editing when a new row appears (rows.length increased)
  const prevLengthRef = useRef(rows.length)
  useEffect(() => {
    if (rows.length > prevLengthRef.current) {
      const newest = rows[rows.length - 1]
      if (newest) startEdit(newest)
    }
    prevLengthRef.current = rows.length
  })
```

(No dependency array — this runs after every render, which is correct: it checks the ref against the latest length and acts only when the count grew.)

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/InlineTable.tsx
git commit -m "feat: auto-edit newly added rows in InlineTable"
```

---

### Task 3: Add CSV export to InlineTable

**Files:**
- Modify: `src/components/InlineTable.tsx`

- [ ] **Step 1: Add `CsvExportConfig` interface and `csvExport` prop**

After the `Row` interface definition (line ~14), add:

```tsx
interface CsvExportConfig {
  filename: string
  grainExport?: (g: string) => string
}
```

Add `csvExport?: CsvExportConfig` to the existing `Props` interface (after the `onGrainToggle` line).

- [ ] **Step 2: Add `handleCsvExport` function inside the component**

After the `cancelEdit` function, add:

```tsx
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
```

- [ ] **Step 3: Add the CSV export link below the add button**

In the JSX, after the closing `</button>` of the add button, add:

```tsx
      {csvExport && rows.length > 0 && (
        <button
          type="button"
          onClick={handleCsvExport}
          className="mt-2 ml-3 text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          CSV exportieren
        </button>
      )}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/InlineTable.tsx
git commit -m "feat: add CSV export to InlineTable"
```

---

### Task 4: Add CSV import and drag-drop to InlineTable

**Files:**
- Modify: `src/components/InlineTable.tsx`

- [ ] **Step 1: Add `CsvImportConfig` interface and `csvImport` prop**

After the `CsvExportConfig` interface, add:

```tsx
interface CsvImportConfig {
  onReplace: (rows: Record<string, unknown>[]) => void
  onAppend: (rows: Record<string, unknown>[]) => void
  parseFile: (text: string) => { rows: Record<string, unknown>[]; errors: string[] }
}
```

Add `csvImport?: CsvImportConfig` to the `Props` interface.

- [ ] **Step 2: Add import state variables inside the component**

After `const firstInputRef = useRef<HTMLInputElement>(null)`, add:

```tsx
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [pendingImport, setPendingImport] = useState<Record<string, unknown>[] | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputId = useId()
```

- [ ] **Step 3: Add file-handling and drag-drop functions inside the component**

After `handleCsvExport`, add:

```tsx
  function handleCsvFile(file: File) {
    if (!csvImport) return
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = csvImport.parseFile(text)
      setImportErrors(result.errors)
      if (result.rows.length > 0) setPendingImport(result.rows)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleCsvImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleCsvFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (csvImport && e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }

  function handleDragLeave() { setIsDragOver(false) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (!csvImport) return
    const file = e.dataTransfer.files[0]
    if (file) handleCsvFile(file)
  }
```

- [ ] **Step 4: Add drag-drop handlers to the outer wrapper `<div>`**

Replace the outermost `<div className="w-full">` with:

```tsx
    <div
      className={`w-full${isDragOver ? ' outline-2 outline-dashed outline-blue-400 bg-blue-50 rounded' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
```

- [ ] **Step 5: Add the CSV import link after the export button**

After the `{csvExport && rows.length > 0 && (...)}` block added in Task 3, add:

```tsx
      {csvImport && (
        <span className="mt-2 inline-block ml-3">
          <label
            htmlFor={fileInputId}
            className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer underline underline-offset-2"
          >
            CSV importieren
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImportChange}
            className="sr-only"
          />
        </span>
      )}
```

- [ ] **Step 6: Add the import dialog and error display before the closing `</div>`**

At the very end of the JSX, before the final `</div>`, add:

```tsx
      {pendingImport && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800 font-medium mb-2">
            {pendingImport.length} Einträge erkannt. Bestehende ersetzen oder hinzufügen?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { csvImport?.onReplace(pendingImport); setPendingImport(null) }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
            >
              Ersetzen
            </button>
            <button
              type="button"
              onClick={() => { csvImport?.onAppend(pendingImport); setPendingImport(null) }}
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
            {importErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}
```

- [ ] **Step 7: Run all tests and build**

Run: `npm run build && npx vitest run`
Expected: Clean build, 18/18 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/InlineTable.tsx
git commit -m "feat: add CSV import and drag-drop to InlineTable"
```

---

### Task 5: Add `parseStockCsv` to csvImport.ts

**Files:**
- Modify: `src/utils/csvImport.ts`

- [ ] **Step 1: Add `parseStockCsv` at the end of the file**

Append to `src/utils/csvImport.ts`:

```typescript
/**
 * Parse a stock-plate CSV (Bezeichnung;L;B;D;Maserung;Anzahl).
 * Reuses parseCsv column mapping and renames 'name' → 'label' for StockTable.
 * Returns rows shaped for InlineTable's csvImport.parseFile contract.
 */
export function parseStockCsv(text: string): { rows: Record<string, unknown>[]; errors: string[] } {
  const result = parseCsv(text)
  return {
    rows: result.pieces.map(p => ({
      label: p.name,
      width: p.width,
      height: p.height,
      thickness: p.thickness,
      grain: p.grain,
      quantity: p.quantity,
    })),
    errors: result.errors,
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/csvImport.ts
git commit -m "feat: add parseStockCsv for stock plate CSV import"
```

---

### Task 6: Wire up sorting and CSV in StockTable

**Files:**
- Modify: `src/components/StockTable.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/StockTable.tsx
import InlineTable, { type Column, type Row } from './InlineTable'
import { useStore } from '../store'
import type { StockPlate } from '../types'
import { parseStockCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'label',     label: 'Bezeichnung', type: 'text',                         sortable: true },
  { key: 'height',    label: 'L',           type: 'number', width: '52px',        sortable: true },
  { key: 'width',     label: 'B',           type: 'number', width: '52px',        sortable: true },
  { key: 'thickness', label: 'D',           type: 'number', width: '40px' },
  { key: 'grain',     label: 'M',           type: 'grain' as const, width: '40px', csvLabel: 'Maserung' },
  { key: 'quantity',  label: 'Anz',         type: 'number', width: '40px',        sortable: true, csvLabel: 'Anzahl' },
]

export default function StockTable() {
  const stockPlates = useStore(s => s.stockPlates)
  const addStockPlate = useStore(s => s.addStockPlate)
  const updateStockPlate = useStore(s => s.updateStockPlate)
  const removeStockPlate = useStore(s => s.removeStockPlate)

  const rows: Row[] = stockPlates.map(p => ({
    id: p.id,
    label: p.label,
    width: p.width,
    height: p.height,
    thickness: p.thickness,
    grain: p.grain,
    quantity: p.quantity,
  }))

  function handleAdd() {
    addStockPlate('', 800, 600, 18, 'any', 1)
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateStockPlate(id, {
      label:     String(values['label'] ?? ''),
      width:     Math.max(1, Number(values['width'])     || 0),
      height:    Math.max(1, Number(values['height'])    || 0),
      thickness: Math.max(1, Number(values['thickness']) || 0),
      grain:     (values['grain'] as string || 'any') as StockPlate['grain'],
      quantity:  Number(values['quantity']),
    })
  }

  function handleDelete(id: string) {
    removeStockPlate(id)
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateStockPlate(id, { grain: next as StockPlate['grain'] })
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
      addLabel="+ Platte hinzufügen"
      onGrainToggle={handleGrainToggle}
      csvExport={{
        filename: 'plattenbestand.csv',
        grainExport: g => g === 'horizontal' ? 'Längs' : g === 'vertical' ? 'Quer' : '',
      }}
      csvImport={{
        parseFile: parseStockCsv,
        onReplace: csvRows => {
          stockPlates.forEach(p => removeStockPlate(p.id))
          csvRows.forEach(row => addStockPlate(
            String(row['label'] ?? ''),
            Number(row['width'])     || 800,
            Number(row['height'])    || 600,
            Number(row['thickness']) || 18,
            (row['grain'] as StockPlate['grain']) ?? 'any',
            Number(row['quantity'])  || 1,
          ))
        },
        onAppend: csvRows => {
          csvRows.forEach(row => addStockPlate(
            String(row['label'] ?? ''),
            Number(row['width'])     || 800,
            Number(row['height'])    || 600,
            Number(row['thickness']) || 18,
            (row['grain'] as StockPlate['grain']) ?? 'any',
            Number(row['quantity'])  || 1,
          ))
        },
      }}
    />
  )
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/StockTable.tsx
git commit -m "feat: add sorting and CSV import/export to StockTable"
```

---

### Task 7: Rewrite PiecesTable using InlineTable

**Files:**
- Modify: `src/components/PiecesTable.tsx`

- [ ] **Step 1: Replace the entire file (510 lines → ~75 lines)**

```tsx
// src/components/PiecesTable.tsx
import InlineTable, { type Column, type Row } from './InlineTable'
import { useStore } from '../store'
import type { CutPiece, Grain } from '../types'
import { parseCsv } from '../utils/csvImport'

const COLUMNS: Column[] = [
  { key: 'name',      label: 'Name', type: 'text',                             sortable: true },
  { key: 'height',    label: 'L',    type: 'number', width: '52px',            sortable: true },
  { key: 'width',     label: 'B',    type: 'number', width: '52px',            sortable: true },
  { key: 'thickness', label: 'D',    type: 'number', width: '40px' },
  { key: 'grain',     label: 'M',    type: 'grain' as const, width: '40px',   csvLabel: 'Maserung' },
  { key: 'quantity',  label: 'Anz',  type: 'number', width: '40px',            sortable: true, csvLabel: 'Anzahl' },
]

export default function PiecesTable() {
  const cutPieces  = useStore(s => s.cutPieces)
  const addCutPiece    = useStore(s => s.addCutPiece)
  const updateCutPiece = useStore(s => s.updateCutPiece)
  const removeCutPiece = useStore(s => s.removeCutPiece)

  const rows: Row[] = cutPieces.map(p => ({
    id:        p.id,
    name:      p.name,
    width:     p.width,
    height:    p.height,
    thickness: p.thickness,
    grain:     p.grain,
    quantity:  p.quantity,
  }))

  function handleAdd() {
    addCutPiece('', 400, 300, 18, 1, 'any')
  }

  function handleSave(id: string, values: Record<string, unknown>) {
    updateCutPiece(id, {
      name:      String(values['name'] ?? '').trim() || 'Teil',
      width:     Math.max(1, Number(values['width'])     || 0),
      height:    Math.max(1, Number(values['height'])    || 0),
      thickness: Math.max(1, Number(values['thickness']) || 0),
      quantity:  Math.max(1, Number(values['quantity'])  || 1),
      grain:     (values['grain'] as CutPiece['grain']) ?? 'any',
    })
  }

  function handleDelete(id: string) {
    removeCutPiece(id)
  }

  function handleGrainToggle(id: string, current: string) {
    const next = current === 'any' ? 'horizontal' : current === 'horizontal' ? 'vertical' : 'any'
    updateCutPiece(id, { grain: next as CutPiece['grain'] })
  }

  return (
    <InlineTable
      columns={COLUMNS}
      rows={rows}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
      addLabel="+ Stück hinzufügen"
      onGrainToggle={handleGrainToggle}
      csvExport={{
        filename: 'stückliste.csv',
        grainExport: g => g === 'horizontal' ? 'Längs' : g === 'vertical' ? 'Quer' : '',
      }}
      csvImport={{
        parseFile: text => {
          const r = parseCsv(text)
          return {
            rows: r.pieces.map(p => ({ ...p })),
            errors: r.errors,
          }
        },
        onReplace: csvRows => {
          cutPieces.forEach(p => removeCutPiece(p.id))
          csvRows.forEach(row => addCutPiece(
            String(row['name'] ?? ''),
            Number(row['width'])     || 400,
            Number(row['height'])    || 300,
            Number(row['thickness']) || 18,
            Number(row['quantity'])  || 1,
            (row['grain'] as Grain)  || 'any',
          ))
        },
        onAppend: csvRows => {
          csvRows.forEach(row => addCutPiece(
            String(row['name'] ?? ''),
            Number(row['width'])     || 400,
            Number(row['height'])    || 300,
            Number(row['thickness']) || 18,
            Number(row['quantity'])  || 1,
            (row['grain'] as Grain)  || 'any',
          ))
        },
      }}
    />
  )
}
```

- [ ] **Step 2: Run all tests and build**

Run: `npm run build && npx vitest run`
Expected: Clean build, 18/18 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/PiecesTable.tsx
git commit -m "feat: rewrite PiecesTable using InlineTable (510 → 75 lines)"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 18/18 tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Visual spot-check**

Run: `npm run dev`

Check in browser:
1. **Sorting** — click L/B/Anz header in StockTable → rows sort, ↑/↓ indicator appears; same for PiecesTable Name/L/Anz
2. **CSV export** — "CSV exportieren" appears when rows exist; downloads `plattenbestand.csv` / `stückliste.csv` with correct semicolons, BOM, and Maserung/Anzahl column headers
3. **CSV import (file)** — "CSV importieren" label → file picker → dialog shows count, Ersetzen/Hinzufügen buttons work
4. **CSV import (drag-drop)** — drag a CSV file onto the table → same dialog appears
5. **Auto-edit** — click "+ Platte hinzufügen" or "+ Stück hinzufügen" → new row immediately opens in edit mode
6. **Tab navigation** — Tab on last field → saves and moves to next row; Shift+Tab on first field → saves and moves to previous row
7. **Visual style unchanged** — cell borders, zebra stripes, padding identical to before
8. **Re-import round-trip** — export CSV, import same file, data matches
