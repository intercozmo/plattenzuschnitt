// src/components/itemColumns.ts
import type { Column } from './InlineTable'
import { parseCsv, type CsvRow } from '../utils/csvImport'

// Table columns of plates, pieces, bars and parts. The order matches the CSV /
// timber list format, so exported files re-import and pasted rows land in the
// right columns (see utils/csvImport.ts).
export function itemColumns(opts: { grain?: boolean; price?: boolean } = {}): Column[] {
  return [
    { key: 'pos',       label: 'Pos',         type: 'text',   width: '36px', sortable: true },
    { key: 'name',      label: 'Name',        type: 'text',   sortable: true, csvLabel: 'Bezeichnung' },
    { key: 'material',  label: 'Material',    type: 'text',   width: '64px', sortable: true },
    { key: 'quantity',  label: 'Anz',         type: 'number', width: '36px', sortable: true, csvLabel: 'Anzahl' },
    { key: 'width',     label: 'B',           type: 'number', width: '44px', sortable: true, csvLabel: 'Breite' },
    { key: 'thickness', label: 'D',           type: 'number', width: '36px', csvLabel: 'Dicke' },
    { key: 'length',    label: 'L',           type: 'number', width: '48px', sortable: true, csvLabel: 'Länge' },
    ...(opts.grain ? [{ key: 'grain', label: 'M', type: 'grain' as const, width: '32px', csvLabel: 'Maserung' }] : []),
    ...(opts.price ? [{ key: 'price', label: '€', type: 'number' as const, width: '44px', csvLabel: 'Preis' }] : []),
  ]
}

export const grainExport = (g: string) => g === 'horizontal' ? 'Längs' : g === 'vertical' ? 'Quer' : ''

// CSV import for a table: parse, then convert each row with `toItem`
export function csvImportConfig<T>(
  toItem: (row: CsvRow) => T,
  replace: (items: T[]) => void,
  append: (items: T[]) => void,
  options?: { requireWidth?: boolean },
) {
  return {
    parseFile: (text: string) => {
      const result = parseCsv(text, options)
      return { rows: result.rows.map(r => ({ ...toItem(r) }) as Record<string, unknown>), errors: result.errors }
    },
    onReplace: (rows: Record<string, unknown>[]) => replace(rows as T[]),
    onAppend: (rows: Record<string, unknown>[]) => append(rows as T[]),
  }
}

export const text = (v: unknown) => String(v ?? '').trim()
export const positive = (v: unknown, fallback: number) => Math.max(1, Number(v) || fallback)
export const nonNegative = (v: unknown) => Math.max(0, Number(v) || 0)
