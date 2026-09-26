import { describe, it, expect } from 'vitest'
import { itemLabel, materialMatches, dimensionMatches, sectionLabel, parseProfile, stockValue, formatEuro, mm, dims, sharePrice } from './items'

describe('item helpers', () => {
  it('prefixes the position number', () => {
    expect(itemLabel({ pos: '3', name: 'Sekundärlattung' })).toBe('3 Sekundärlattung')
    expect(itemLabel({ name: 'Seite' })).toBe('Seite')
  })

  it('matches materials case-insensitively, empty matches anything', () => {
    expect(materialMatches('Accoya', ' accoya ')).toBe(true)
    expect(materialMatches('Accoya', 'Lärche')).toBe(false)
    expect(materialMatches('', 'Lärche')).toBe(true)
    expect(materialMatches(undefined, 'Lärche')).toBe(true)
  })

  it('treats 0 as unspecified dimension', () => {
    expect(dimensionMatches(70, 70)).toBe(true)
    expect(dimensionMatches(70, 45)).toBe(false)
    expect(dimensionMatches(0, 45)).toBe(true)
  })

  it('formats and parses cross-sections', () => {
    expect(sectionLabel({ width: 70, thickness: 45, material: 'Accoya' })).toBe('70.0×45.0 Accoya')
    expect(sectionLabel({ width: 0, thickness: 0, material: '' })).toBe('')
    expect(parseProfile('70×45 Accoya')).toEqual({ width: 70, thickness: 45, material: 'Accoya' })
    expect(parseProfile('40x60')).toEqual({ width: 40, thickness: 60, material: '' })
    expect(parseProfile('Rundstab')).toEqual({ width: 0, thickness: 0, material: 'Rundstab' })
  })
})

describe('stock value', () => {
  it('sums quantity × price and ignores missing prices', () => {
    expect(stockValue([{ quantity: 3, price: 49.9 }, { quantity: 2 }, { quantity: 1, price: 10 }])).toBeCloseTo(159.7)
    expect(stockValue([])).toBe(0)
  })

  it('formats euros the German way', () => {
    expect(formatEuro(1234.5).replace(/\s/g, ' ')).toBe('1.234,50 €')
  })
})

describe('dimensions and price shares', () => {
  it('formats dimensions in mm with one decimal', () => {
    expect(mm(720)).toBe('720.0')
    expect(mm(12.55)).toBe('12.6')
    expect(dims(2800, 2070, 18)).toBe('2800.0 × 2070.0 × 18.0 mm')
    expect(sectionLabel({ width: 70, thickness: 45, material: 'Accoya' })).toBe('70.0×45.0 Accoya')
  })

  it('shares the stock price by area or length', () => {
    // quarter of a 100 € plate
    expect(sharePrice(100, 2000 * 1000, 1000 * 500)).toBe(25)
    // 1200 mm of a 6000 mm bar at 30 €
    expect(sharePrice(30, 6000, 1200)).toBeCloseTo(6)
    expect(sharePrice(30, 0, 1200)).toBe(0)
  })
})
