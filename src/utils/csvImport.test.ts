import { describe, it, expect } from 'vitest'
import { parseCsv } from './csvImport'

// Verbatim content of an exported timber list (Holzdeck.csv): UTF-8 BOM, CRLF,
// metadata lines, no header; Pos;Bezeichnung;Material;Anzahl;Breite;Dicke;Länge;Volumen
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

describe('timber list export (Holzliste)', () => {
  it('reads every position with all fields', () => {
    const r = parseCsv(holzdeck, { requireWidth: true })
    expect(r.errors).toEqual([])
    expect(r.rows).toHaveLength(9)
    expect(r.rows[0]).toEqual({
      pos: '1', name: 'Sekundärlattung', material: 'Accoya', quantity: 1,
      width: 70, thickness: 45, length: 2480, grain: 'any', price: 0,
    })
    expect(r.rows[8]).toMatchObject({ pos: '9', quantity: 12, length: 180 })
    expect(r.rows.reduce((s, p) => s + p.quantity, 0)).toBe(27)
  })

  it('also reads metadata lines with values', () => {
    const r = parseCsv('Projektname;Holzdeck Müller\nBauherr;Müller\n1;Latte;Lärche;2;70;45;3000;0.02')
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([expect.objectContaining({ name: 'Latte', material: 'Lärche', quantity: 2, length: 3000 })])
  })
})

describe('header rows', () => {
  it('maps German headers in any order', () => {
    const r = parseCsv('Bezeichnung;Länge;Breite;Dicke;Anzahl;Material;Pos\nSeite;720;560;18;2;Eiche;4')
    expect(r.rows).toEqual([{ pos: '4', name: 'Seite', material: 'Eiche', quantity: 2, width: 560, thickness: 18, length: 720, grain: 'any', price: 0 }])
  })

  it('maps English headers, grain and price (decimal comma)', () => {
    const r = parseCsv('name;length;width;quantity;grain;price\nTop;600;400;1;horizontal;45,90')
    expect(r.rows[0]).toMatchObject({ name: 'Top', length: 600, width: 400, grain: 'horizontal', price: 45.9 })
  })

  it('round-trips the table export format', () => {
    const r = parseCsv('Pos;Bezeichnung;Material;Anzahl;Breite;Dicke;Länge;Maserung;Preis\r\n1;MDF;;2;2070;19;2800;Längs;39.5')
    expect(r.rows[0]).toEqual({ pos: '1', name: 'MDF', material: '', quantity: 2, width: 2070, thickness: 19, length: 2800, grain: 'horizontal', price: 39.5 })
  })

  it('converts the former 1D profile column', () => {
    const r = parseCsv('Bezeichnung;L;Profil;Anzahl\nRiegel;1200;60×80 Fichte;4')
    expect(r.rows[0]).toMatchObject({ width: 60, thickness: 80, material: 'Fichte', length: 1200, quantity: 4 })
  })
})

describe('rows without header', () => {
  it('parses tab-separated rows pasted from Excel in table order', () => {
    const r = parseCsv('3\tBoden\tBuche\t2\t500\t19\t800\r\n4\tSeite\t\t1\t560\t19\t720\r\n')
    expect(r.errors).toEqual([])
    expect(r.rows.map(p => [p.pos, p.name, p.material, p.quantity, p.width, p.thickness, p.length]))
      .toEqual([['3', 'Boden', 'Buche', 2, 500, 19, 800], ['4', 'Seite', '', 1, 560, 19, 720]])
  })

  it('defaults missing name, quantity, width and thickness', () => {
    const r = parseCsv('L\n1500')
    expect(r.rows[0]).toMatchObject({ name: 'Teil 1', quantity: 1, width: 0, thickness: 0, length: 1500 })
  })
})

describe('validation', () => {
  it('reports invalid rows with their line number', () => {
    const r = parseCsv('Bezeichnung;L;B\nA;abc;100\nB;200;x\nC;200;100')
    expect(r.errors).toEqual(['Zeile 2: Ungültige Länge', 'Zeile 3: Ungültige Breite'])
    expect(r.rows).toHaveLength(1)
  })

  it('requires a width for 2D items only when asked', () => {
    expect(parseCsv('L\n1500', { requireWidth: true }).errors).toEqual(['Zeile 2: Ungültige Breite'])
    expect(parseCsv('L\n1500').errors).toEqual([])
  })

  it('reports empty input', () => {
    expect(parseCsv('\n\n').errors).toEqual(['Keine Daten gefunden.'])
  })
})
