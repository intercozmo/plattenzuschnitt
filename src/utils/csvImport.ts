// src/utils/csvImport.ts
// One CSV / clipboard format for all tables (plates, pieces, bars, parts).
// Column order follows the timber list export ("Holzliste"):
//   Pos; Bezeichnung; Material; Anzahl; Breite; Dicke; Länge (; Maserung; Preis)
import type { Grain } from '../types'
import { parseProfile } from './items'

export interface CsvRow {
  pos: string
  name: string
  material: string
  quantity: number
  width: number      // mm, 0 = not given
  thickness: number  // mm, 0 = not given
  length: number     // mm (L; height of 2D items)
  grain: Grain
  price: number      // €, 0 = not given
}

export interface CsvResult {
  rows: CsvRow[]
  errors: string[]
}

export interface CsvOptions {
  requireWidth?: boolean  // 2D items need a width
}

// Column order of all tables, used when a file has no header row.
// A timber list's 8th column (Volumen) lands on "grain" and is ignored as such.
const COLUMN_ORDER = ['pos', 'name', 'material', 'quantity', 'width', 'thickness', 'length', 'grain', 'price']

function detectSeparator(line: string): string {
  // Tab-separated = pasted from Excel / Google Sheets
  if (line.includes('\t')) return '\t'
  const semicolons = (line.match(/;/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function mapColumnName(name: string): string | null {
  const n = name.trim().toLowerCase()
  if (['pos', 'pos.', 'position', 'nr', 'nr.'].includes(n)) return 'pos'
  if (['name', 'bezeichnung', 'label', 'beschreibung'].includes(n)) return 'name'
  if (['material', 'holzart', 'werkstoff'].includes(n)) return 'material'
  if (['anzahl', 'quantity', 'anz', 'qty', 'menge', 'stück', 'stk'].includes(n)) return 'quantity'
  if (['breite', 'width', 'b', 'w'].includes(n)) return 'width'
  if (['dicke', 'd', 'thickness', 't', 'stärke', 'staerke'].includes(n)) return 'thickness'
  if (['länge', 'laenge', 'length', 'l', 'höhe', 'hoehe', 'height', 'h'].includes(n)) return 'length'
  if (['maserung', 'grain', 'faserrichtung', 'm'].includes(n)) return 'grain'
  if (['preis', 'price', 'kosten', '€'].includes(n)) return 'price'
  // Former free-text 1D cross-section, e.g. "70×45 Accoya"
  if (['profil', 'profile', 'querschnitt'].includes(n)) return 'profile'
  return null
}

function mapGrain(value: string): Grain {
  const v = value.trim().toLowerCase()
  if (['längs', 'langs', 'horizontal', 'h'].includes(v)) return 'horizontal'
  if (['quer', 'vertical', 'v'].includes(v)) return 'vertical'
  return 'any'
}

// "Projektname;" or "Bauherr;Müller" before the table: at most two cells,
// not starting with a number and not a header row
function isMetadataLine(cells: string[]): boolean {
  return cells.length <= 2
    && cells[0].trim() !== ''
    && isNaN(Number(cells[0].trim()))
    && cells.every(c => mapColumnName(c) === null)
}

export function parseCsv(text: string, options: CsvOptions = {}): CsvResult {
  const rows: CsvRow[] = []
  const errors: string[] = []

  const lines = text.replace(/^﻿/, '').split('\n').map(l => l.trimEnd())
  let first = 0
  while (first < lines.length && lines[first].trim() === '') first++
  if (first >= lines.length) return { rows, errors: ['Keine Daten gefunden.'] }

  const sep = detectSeparator(lines[first])
  const split = (line: string) => line.split(sep).map(c => c.trim())
  // Decimal comma ("12,5") is only unambiguous when comma is not the separator
  const num = (cell: string) => Number(sep === ',' ? cell : cell.replace(',', '.'))

  while (first < lines.length && isMetadataLine(split(lines[first]))) first++

  let colMap: Record<number, string> = {}
  split(lines[first] ?? '').forEach((cell, i) => {
    const mapped = mapColumnName(cell)
    if (mapped !== null) colMap[i] = mapped
  })
  let firstDataLine = first + 1
  if (Object.keys(colMap).length === 0) {
    colMap = Object.fromEntries(COLUMN_ORDER.map((field, i) => [i, field]))
    firstDataLine = first
  }

  for (let lineIdx = firstDataLine; lineIdx < lines.length; lineIdx++) {
    if (lines[lineIdx].trim() === '') continue
    const cells = split(lines[lineIdx])
    const cell: Record<string, string> = {}
    for (const [idx, field] of Object.entries(colMap)) cell[field] = cells[Number(idx)] ?? ''

    const line = `Zeile ${lineIdx + 1}`
    const profile = cell['profile'] ? parseProfile(cell['profile']) : null
    const length = num(cell['length'] ?? '')
    const width = cell['width'] ? num(cell['width']) : profile?.width ?? 0
    const thickness = cell['thickness'] ? num(cell['thickness']) : profile?.thickness ?? 0
    const quantity = cell['quantity'] ? num(cell['quantity']) : 1
    const price = cell['price'] ? num(cell['price']) : 0

    if (!cell['length'] || isNaN(length) || length <= 0) { errors.push(`${line}: Ungültige Länge`); continue }
    if (isNaN(width) || width < 0 || (options.requireWidth && width <= 0)) { errors.push(`${line}: Ungültige Breite`); continue }
    if (isNaN(thickness) || thickness < 0) { errors.push(`${line}: Ungültige Dicke`); continue }
    if (isNaN(quantity) || quantity < 1) { errors.push(`${line}: Ungültige Anzahl`); continue }

    rows.push({
      pos: cell['pos'] ?? '',
      name: cell['name'] || `Teil ${rows.length + 1}`,
      material: cell['material'] || profile?.material || '',
      quantity: Math.round(quantity),
      width,
      thickness,
      length,
      grain: mapGrain(cell['grain'] ?? ''),
      price: isNaN(price) || price < 0 ? 0 : price,
    })
  }

  return { rows, errors }
}
