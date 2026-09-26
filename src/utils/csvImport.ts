// src/utils/csvImport.ts

export interface CsvPiece {
  name: string
  width: number
  height: number
  thickness: number
  quantity: number
  grain: 'any' | 'horizontal' | 'vertical'
  price?: number  // only set when the file has a price column
}

export interface CsvImportResult {
  pieces: CsvPiece[]
  errors: string[]
}

function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] ?? ''
  // Tab-separated = pasted from Excel / Google Sheets
  if (firstLine.includes('\t')) return '\t'
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function mapColumnName(name: string): string | null {
  const n = name.trim().toLowerCase()
  if (['breite', 'width', 'b', 'w'].includes(n)) return 'width'
  if (['länge', 'laenge', 'hoehe', 'height', 'h', 'l'].includes(n)) return 'height'
  if (['anzahl', 'quantity', 'anz', 'qty', 'menge'].includes(n)) return 'quantity'
  if (['name', 'bezeichnung', 'label', 'beschreibung'].includes(n)) return 'name'
  if (['maserung', 'grain', 'faserrichtung'].includes(n)) return 'grain'
  if (['dicke', 'd', 'thickness', 't'].includes(n)) return 'thickness'
  if (['preis', 'price', 'kosten', '€'].includes(n)) return 'price'
  return null
}

// Column order of StockTable / PiecesTable: Name, L, B, D, M, Anz
// (StockTable additionally has €)
const DEFAULT_COLUMN_ORDER = ['name', 'height', 'width', 'thickness', 'grain', 'quantity', 'price']

function mapGrain(value: string): 'any' | 'horizontal' | 'vertical' {
  const v = value.trim().toLowerCase()
  if (['längs', 'langs', 'horizontal', 'h'].includes(v)) return 'horizontal'
  if (['quer', 'vertical', 'v'].includes(v)) return 'vertical'
  return 'any'
}

export function parseCsv(text: string): CsvImportResult {
  const pieces: CsvPiece[] = []
  const errors: string[] = []

  const sep = detectSeparator(text)
  const lines = text.split('\n').map(l => l.trimEnd())

  // Need at least a header row
  if (lines.length === 0 || lines[0].trim() === '') {
    errors.push('Keine Daten gefunden.')
    return { pieces, errors }
  }

  // Parse header
  const headerCells = lines[0].split(sep)
  let colMap: Record<number, string> = {}
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = mapColumnName(headerCells[i])
    if (mapped !== null) colMap[i] = mapped
  }

  // No header recognized (e.g. rows copied from Excel without header):
  // assume the table's column order and treat the first line as data
  let firstDataLine = 1
  if (Object.keys(colMap).length === 0) {
    colMap = Object.fromEntries(DEFAULT_COLUMN_ORDER.map((field, i) => [i, field]))
    firstDataLine = 0
  }

  // Process data rows (starting at line index 1, displayed as line 2)
  for (let lineIdx = firstDataLine; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim()
    if (line === '') continue

    const cells = lines[lineIdx].split(sep)
    const row: Record<string, string> = {}
    for (const [idxStr, field] of Object.entries(colMap)) {
      row[field] = (cells[Number(idxStr)] ?? '').trim()
    }

    // Display line number is 1-based, header is line 1, first data row is line 2
    const displayLine = lineIdx + 1

    // Validate required numeric fields
    const widthRaw = row['width'] ?? ''
    const heightRaw = row['height'] ?? ''
    const thicknessRaw = row['thickness'] ?? ''
    const quantityRaw = row['quantity'] ?? '1'

    const width = Number(widthRaw)
    const height = Number(heightRaw)
    const thickness = thicknessRaw === '' ? 18 : Number(thicknessRaw)
    const quantity = quantityRaw === '' ? 1 : Number(quantityRaw)

    if (widthRaw === '' || isNaN(width) || width <= 0) {
      errors.push(`Zeile ${displayLine}: Ungültige Breite`)
      continue
    }
    if (heightRaw === '' || isNaN(height) || height <= 0) {
      errors.push(`Zeile ${displayLine}: Ungültige Länge`)
      continue
    }
    if (isNaN(quantity) || quantity < 1) {
      errors.push(`Zeile ${displayLine}: Ungültige Anzahl`)
      continue
    }

    const dataRowIndex = lineIdx - firstDataLine  // 0-based index among data rows
    const rawName = row['name'] ?? ''
    const name = rawName.trim() || `Teil ${dataRowIndex + 1}`
    const grain = mapGrain(row['grain'] ?? '')

    const piece: CsvPiece = { name, width, height, thickness, quantity: Math.round(quantity), grain }
    if (row['price']) {
      // Accept German decimal comma ("12,50")
      const price = Number(row['price'].replace(',', '.'))
      piece.price = isNaN(price) || price < 0 ? 0 : price
    }
    pieces.push(piece)
  }

  return { pieces, errors }
}

export interface CsvStock {
  label: string
  width: number
  height: number
  thickness: number
  quantity: number
  grain: 'any' | 'horizontal' | 'vertical'
  price: number
}

export interface CsvStockResult {
  plates: CsvStock[]
  errors: string[]
}

export function parseStockCsv(text: string): CsvStockResult {
  const result = parseCsv(text)
  return {
    plates: result.pieces.map(p => ({
      label: p.name,
      width: p.width,
      height: p.height,
      thickness: p.thickness,
      quantity: p.quantity,
      grain: p.grain,
      price: p.price ?? 0,
    })),
    errors: result.errors,
  }
}
