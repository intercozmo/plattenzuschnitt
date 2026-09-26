// src/utils/items.ts
// Shared helpers for plates, pieces, bars and parts

// All dimensions are shown in mm with one decimal: "720.0"
export function mm(value: number): string {
  return value.toFixed(1)
}

// "720.0 × 560.0 mm"
export function dims(...values: number[]): string {
  return `${values.map(mm).join(' × ')} mm`
}

// Price share of a piece/offcut by area (2D) or length (1D) of its plate/bar
export function sharePrice(stockPrice: number, stockSize: number, itemSize: number): number {
  return stockSize > 0 ? stockPrice * itemSize / stockSize : 0
}

// Display name including the position number, e.g. "3 Sekundärlattung"
export function itemLabel(item: { pos?: string; name: string }): string {
  return item.pos ? `${item.pos} ${item.name}`.trim() : item.name
}

// Materials match when equal (ignoring case/whitespace) or when either is unspecified
export function materialMatches(a: string | undefined, b: string | undefined): boolean {
  const x = (a ?? '').trim().toLowerCase()
  const y = (b ?? '').trim().toLowerCase()
  return x === '' || y === '' || x === y
}

// Dimensions match when equal or when either is unspecified (0)
export function dimensionMatches(a: number, b: number): boolean {
  return a === 0 || b === 0 || a === b
}

// Cross-section label for 1D items, e.g. "70×45 Accoya"
export function sectionLabel(item: { width: number; thickness: number; material: string }): string {
  const section = item.width > 0 && item.thickness > 0 ? `${mm(item.width)}×${mm(item.thickness)}` : ''
  return [section, item.material.trim()].filter(Boolean).join(' ')
}

// Converts a former free-text 1D profile ("70×45 Accoya", "40x60") into fields
export function parseProfile(profile: string): { width: number; thickness: number; material: string } {
  const m = profile.trim().match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i)
  if (!m) return { width: 0, thickness: 0, material: profile.trim() }
  return {
    width: Number(m[1].replace(',', '.')),
    thickness: Number(m[2].replace(',', '.')),
    material: m[3].trim(),
  }
}

// Short descriptions used in lists and notices
export function describePlate(p: { label: string; height: number; width: number; thickness: number; material?: string }): string {
  return `${p.label ? `${p.label} ` : ''}${dims(p.height, p.width, p.thickness)}${p.material ? ` · ${p.material}` : ''}`
}

export function describeBar(b: { label: string; length: number; width: number; thickness: number; material: string }): string {
  const section = sectionLabel(b)
  return `${b.label ? `${b.label} ` : ''}L ${dims(b.length)}${section ? ` · ${section}` : ''}`
}

// Total value of stock entries (quantity × price per piece)
export function stockValue(items: Array<{ quantity: number; price?: number }>): number {
  return items.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0)
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
