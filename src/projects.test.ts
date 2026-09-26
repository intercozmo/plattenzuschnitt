import { describe, it, expect, vi } from 'vitest'
import { parseProjects, parseProjectFile, serializeProjectFile } from './projects'
import { parsePersistedState } from './persistence'

const plate = { id: 's1', label: 'MDF', width: 2070, height: 2800, thickness: 19, grain: 'any', quantity: 2, price: 40 }
const piece = { id: 'c1', name: 'Seite', width: 560, height: 720, thickness: 19, quantity: 4, grain: 'any' }

describe('parsePersistedState', () => {
  it('back-fills missing fields of old data', () => {
    const r = parsePersistedState({ stockPlates: [{ id: 's', label: 'A', width: 100, height: 200, quantity: 1 }], cutPieces: [] })
    expect(r?.stockPlates[0]).toMatchObject({ thickness: 18, grain: 'any', price: 0 })
  })

  it('rejects data without plate and piece arrays', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parsePersistedState({ stockPlates: [] })).toBeNull()
    expect(parsePersistedState(null)).toBeNull()
  })

  it('keeps options and project name', () => {
    const r = parsePersistedState({ stockPlates: [], cutPieces: [], kerf: 4, priority: 'balanced', projectName: 'Küche' })
    expect(r).toMatchObject({ kerf: 4, priority: 'balanced', projectName: 'Küche' })
  })
})

describe('project files', () => {
  it('round-trips through serialize and parse', () => {
    const data = { stockPlates: [plate], cutPieces: [piece], kerf: 3 } as never
    const r = parseProjectFile(serializeProjectFile('Küche', data))
    expect(r?.name).toBe('Küche')
    expect(r?.data.stockPlates[0]).toEqual(plate)
    expect(r?.data.cutPieces[0]).toEqual(piece)
    expect(r?.data.kerf).toBe(3)
  })

  it('rejects foreign JSON and invalid text', () => {
    expect(parseProjectFile('{"foo": 1}')).toBeNull()
    expect(parseProjectFile('not json')).toBeNull()
  })
})

describe('parseProjects', () => {
  it('skips invalid entries', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = JSON.stringify([
      { name: 'A', updatedAt: '2026-01-01T00:00:00Z', data: { stockPlates: [plate], cutPieces: [] } },
      { name: 'B', updatedAt: '2026-01-02T00:00:00Z', data: { broken: true } },
      { updatedAt: '2026-01-03T00:00:00Z', data: { stockPlates: [], cutPieces: [] } },
    ])
    expect(parseProjects(raw).map(p => p.name)).toEqual(['A'])
  })

  it('returns an empty list for missing or corrupt storage', () => {
    expect(parseProjects(null)).toEqual([])
    expect(parseProjects('{')).toEqual([])
  })
})
