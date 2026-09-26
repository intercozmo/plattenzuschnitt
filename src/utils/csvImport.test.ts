import { describe, it, expect } from 'vitest'
import { parseCsv, parseStockCsv, parseLinearCsv } from './csvImport'

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

describe('parseLinearCsv', () => {
  it('parses headers, profiles and prices', () => {
    const r = parseLinearCsv('Bezeichnung;Länge;Profil;Anzahl;Preis\nLatte;6000;40×60;5;12,50')
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([{ name: 'Latte', length: 6000, profile: '40×60', quantity: 5, price: 12.5 }])
  })

  it('assumes table column order without header', () => {
    const r = parseLinearCsv('Riegel\t1200\t40×60\t4\nPfosten\t2400\t40×60')
    expect(r.rows).toEqual([
      { name: 'Riegel', length: 1200, profile: '40×60', quantity: 4, price: 0 },
      { name: 'Pfosten', length: 2400, profile: '40×60', quantity: 1, price: 0 },
    ])
  })

  it('reports invalid lengths', () => {
    const r = parseLinearCsv('Name;L\nA;x')
    expect(r.errors).toEqual(['Zeile 2: Ungültige Länge'])
  })
})

describe('timber list export (Holzliste)', () => {
  // Verbatim content of an exported timber list: UTF-8 BOM, CRLF, metadata lines, no header
  const holzdeck = '\uFEFF' +
  'Projektname;\r\n' +
  'Projektnummer;\r\n' +
  'Bauherr;\r\n' +
  'Liefertermin;\r\n' +
  '1;Sekundärlattung;Accoya;1;70;45;2480;0.01\r\n' +
  '2;Sekundärlattung;Accoya;2;70;45;2456;0.02\r\n' +
  '3;Sekundärlattung;Accoya;2;70;45;2376;0.01\r\n' +
  '4;Sekundärlattung;Accoya;2;70;45;2239;0.01\r\n' +
  '5;Sekundärlattung;Accoya;2;70;45;2169;0.01\r\n' +
  '6;Sekundärlattung;Accoya;2;70;45;2006;0.01\r\n' +
  '7;Sekundärlattung;Accoya;2;70;45;1644;0.01\r\n' +
  '8;Sekundärlattung;Accoya;2;70;45;1185;0.01\r\n' +
  '9;Sekundärlattung;Accoya;12;70;45;180;0.01\r\n'

  it('reads every position as a piece', () => {
    const r = parseCsv(holzdeck)
    expect(r.errors).toEqual([])
    expect(r.pieces).toHaveLength(9)
    expect(r.pieces[0]).toEqual({ name: '1 Sekundärlattung', width: 70, height: 2480, thickness: 45, quantity: 1, grain: 'any' })
    expect(r.pieces[8]).toEqual({ name: '9 Sekundärlattung', width: 70, height: 180, thickness: 45, quantity: 12, grain: 'any' })
    expect(r.pieces.reduce((s, p) => s + p.quantity, 0)).toBe(27)
  })

  it('does not treat normal CSV files as timber lists', () => {
    const r = parseCsv('1;Seite;Fichte;2;560;18;720;0.01;extra')
    expect(r.pieces).not.toContainEqual(expect.objectContaining({ name: '1 Seite' }))
  })
})
