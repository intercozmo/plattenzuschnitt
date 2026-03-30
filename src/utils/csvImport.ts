// src/utils/csvImport.ts

export interface CsvPiece {
  name: string
  width: number
  height: number
  quantity: number
  grain: 'any' | 'horizontal' | 'vertical'
}

export interface CsvImportResult {
  pieces: CsvPiece[]
  errors: string[]
}

function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] ?? ''
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
  return null
}

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
  const colMap: Record<number, string> = {}
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = mapColumnName(headerCells[i])
    if (mapped !== null) colMap[i] = mapped
  }

  // Process data rows (starting at line index 1, displayed as line 2)
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
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
    const quantityRaw = row['quantity'] ?? '1'

    const width = Number(widthRaw)
    const height = Number(heightRaw)
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

    const name = row['name'] ?? ''
    const grain = mapGrain(row['grain'] ?? '')

    pieces.push({ name, width, height, quantity: Math.round(quantity), grain })
  }

  return { pieces, errors }
}
