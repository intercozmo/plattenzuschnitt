# Tabellen-Vereinheitlichung: Plattenbestand & Stückliste

StockTable und PiecesTable sollen denselben Feature-Satz und dieselbe technische Basis (`InlineTable`) nutzen. Das Aussehen bleibt wie es ist (Excel-Stil mit Zellrändern, Zebra-Streifen).

## Problem

- **StockTable** nutzt `InlineTable` — hat aber keine Sortierung, kein CSV, keine Tab-Navigation zwischen Zeilen, kein Auto-Edit neuer Zeilen.
- **PiecesTable** hat all diese Features — als 510 Zeilen custom-Code, der `InlineTable` nicht nutzt.
- Ergebnis: Inkonsistentes Verhalten, doppelter Editing-Code.

## Lösung: InlineTable erweitern

`InlineTable` wird zur vollständigen Tabellen-Komponente. PiecesTable wird auf InlineTable umgestellt.

### Neue InlineTable-Features

#### 1. Sortierbare Spalten
- `Column` bekommt optionales `sortable: boolean` Feld
- Klick auf Header toggelt asc/desc (wie PiecesTable jetzt)
- Sort-Indikator (↑/↓) im Header
- Header bekommt `cursor-pointer` und `hover:bg-slate-200` wenn sortierbar

#### 2. CSV Import/Export
Neue optionale Props auf InlineTable:

```typescript
csvExport?: {
  filename: string           // z.B. 'plattenbestand.csv' oder 'stückliste.csv'
  grainExport?: (g: string) => string  // Optional: Grain-Wert → CSV-String
}
csvImport?: {
  onReplace: (rows: Record<string, unknown>[]) => void  // Callback: alle ersetzen
  onAppend: (rows: Record<string, unknown>[]) => void   // Callback: zu bestehenden hinzufügen
  parseFile: (text: string) => { rows: Record<string, unknown>[]; errors: string[] }
}
```

- Export: Semikolon-getrennt, BOM für Excel, Spaltennamen aus `Column.label`
- Import: `<input type="file">` + Drag&Drop auf Tabelle
- Import-Dialog: "N Einträge erkannt. Ersetzen oder Hinzufügen?" (wie PiecesTable jetzt)
- Import-Warnungen werden angezeigt
- CSV-Links ("CSV importieren" / "CSV exportieren") erscheinen neben dem Add-Button

#### 3. Tab-Navigation zwischen Zeilen
- Tab auf letztem Feld → speichert aktuelle Zeile, springt zur nächsten
- Shift+Tab auf erstem Feld → speichert aktuelle Zeile, springt zur vorherigen
- ArrowDown/ArrowUp in Nicht-Edit-Modus → Focus auf nächste/vorherige Zeile (bereits vorhanden)

#### 4. Auto-Edit neuer Zeilen
- Wenn `rows.length` steigt → automatisch letzte (neue) Zeile in Edit-Modus
- Nutzt `useRef` für vorherige Länge (wie PiecesTable jetzt)

### CSV-Format (identisch für beide Tabellen)

```
Bezeichnung;L;B;D;Maserung;Anzahl
Birke MPX;2440;1220;18;;3
Eiche;2800;2070;19;Längs;2
```

- Semikolon-getrennt
- UTF-8 mit BOM (`\uFEFF`)
- Maserung: `Längs` / `Quer` / leer (= keine/any)
- Spaltenreihenfolge folgt `Column`-Definition

### StockTable CSV-Spezifika

- Dateiname: `plattenbestand.csv`
- Import nutzt bestehende `parseCsv` aus `src/utils/csvImport.ts` (ggf. erweitern für Stock-Spalten)
- Export-Header: `Bezeichnung;L;B;D;Maserung;Anzahl`

### PiecesTable CSV-Spezifika

- Dateiname: `stückliste.csv`
- Export-Header: `Name;L;B;D;Maserung;Anzahl`
- Bestehendes `parseCsv` wird weiterverwendet

## Dateien

| Datei | Änderung |
|---|---|
| `src/components/InlineTable.tsx` | Sortierung, CSV, Tab-Nav, Auto-Edit einbauen |
| `src/components/StockTable.tsx` | CSV-Props konfigurieren, Import-Handler |
| `src/components/PiecesTable.tsx` | Auf InlineTable umstellen, custom-Code entfernen |
| `src/utils/csvImport.ts` | Ggf. erweitern für Stock-Spalten ("Bezeichnung" als Name-Mapping) |

## Nicht geändert

- Tabellen-Aussehen (Zellränder, Zebra, Farben, Padding)
- Spaltenreihenfolge (Bezeichnung/Name → L → B → D → M → Anz)
- Grain-Toggle Verhalten (Klick toggelt any → horizontal → vertical)
- Store/Persistence/Types

## Verifikation

1. `npm run test` — alle bestehenden Tests bestehen
2. `npm run build` — sauber
3. Manuell prüfen:
   - StockTable: Sortierung per Klick auf L/B/Anz Header
   - StockTable: CSV Export → `plattenbestand.csv` mit korrekten Daten
   - StockTable: CSV Import (Datei + Drag&Drop) → Ersetzen/Hinzufügen Dialog
   - StockTable: Tab-Navigation zwischen Zeilen
   - StockTable: Neue Platte → automatisch im Edit-Modus
   - PiecesTable: Alle bisherigen Features funktionieren wie vorher
   - Beide: Gleiches Look & Feel, gleiche Tastaturkürzel
