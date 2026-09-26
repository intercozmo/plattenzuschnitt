import { describe, it, expect } from 'vitest'
import { itemLabel, materialMatches, dimensionMatches, sectionLabel, parseProfile } from './items'

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
    expect(sectionLabel({ width: 70, thickness: 45, material: 'Accoya' })).toBe('70×45 Accoya')
    expect(sectionLabel({ width: 0, thickness: 0, material: '' })).toBe('')
    expect(parseProfile('70×45 Accoya')).toEqual({ width: 70, thickness: 45, material: 'Accoya' })
    expect(parseProfile('40x60')).toEqual({ width: 40, thickness: 60, material: '' })
    expect(parseProfile('Rundstab')).toEqual({ width: 0, thickness: 0, material: 'Rundstab' })
  })
})
