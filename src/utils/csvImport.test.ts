import { describe, it, expect } from 'vitest'
import { parseCsv, parseStockCsv } from './csvImport'

describe('parseCsv', () => {
  it('parses semicolon CSV with German headers', () => {
    const r = parseCsv('Name;Länge;Breite;Dicke;Anzahl\nSeite;720;560;18;2')
    expect(r.errors).toEqual([])
    expect(r.pieces).toEqual([
      { name: 'Seite', height: 720, width: 560, thickness: 18, quantity: 2, grain: 'any' },
    ])
  })

  it('parses comma CSV with English headers', () => {
    const r = parseCsv('name,height,width,quantity,grain\nTop,600,400,1,horizontal')
    expect(r.pieces).toEqual([
      { name: 'Top', height: 600, width: 400, thickness: 18, quantity: 1, grain: 'horizontal' },
    ])
  })

  it('parses tab-separated data pasted from Excel', () => {
    const r = parseCsv('Name\tL\tB\tAnz\r\nBoden\t800\t500\t3\r\n')
    expect(r.errors).toEqual([])
    expect(r.pieces).toEqual([
      { name: 'Boden', height: 800, width: 500, thickness: 18, quantity: 3, grain: 'any' },
    ])
  })

  it('assumes table column order when there is no header row', () => {
    const r = parseCsv('Seite\t720\t560\t19\tLängs\t2\nBoden\t800\t500\t19\t\t1')
    expect(r.errors).toEqual([])
    expect(r.pieces).toEqual([
      { name: 'Seite', height: 720, width: 560, thickness: 19, quantity: 2, grain: 'horizontal' },
      { name: 'Boden', height: 800, width: 500, thickness: 19, quantity: 1, grain: 'any' },
    ])
  })

  it('reports invalid rows with their line number', () => {
    const r = parseCsv('Name;L;B\nA;abc;100\nB;200;100')
    expect(r.errors).toEqual(['Zeile 2: Ungültige Länge'])
    expect(r.pieces).toHaveLength(1)
  })
})

describe('parseStockCsv', () => {
  it('maps name to label', () => {
    const r = parseStockCsv('Bezeichnung;L;B;D;Anzahl\nSpanplatte;2800;2070;19;4')
    expect(r.plates).toEqual([
      { label: 'Spanplatte', height: 2800, width: 2070, thickness: 19, quantity: 4, grain: 'any', price: 0 },
    ])
  })
})

describe('price column', () => {
  it('reads stock prices with decimal comma', () => {
    const r = parseStockCsv('Bezeichnung;L;B;Anzahl;Preis\nMDF;2800;2070;2;45,90')
    expect(r.plates[0].price).toBe(45.9)
  })

  it('defaults stock price to 0 when the column is missing', () => {
    const r = parseStockCsv('L;B\n2800;2070')
    expect(r.plates[0].price).toBe(0)
  })

  it('reads price as 7th column of headerless stock rows', () => {
    const r = parseStockCsv('MDF\t2800\t2070\t19\t\t2\t39.5')
    expect(r.plates[0]).toMatchObject({ label: 'MDF', quantity: 2, price: 39.5 })
  })
})
