# Visuelle Verbesserungen v0.2.1

Drei gezielte Verbesserungen am Schnittdiagramm und der Schnittfolge-Tabelle, basierend auf dem Vergleich mit cutlistoptimizer.com.

## 1. Verschnitt-Darstellung mit Schraffur

**Datei:** `src/components/CutDiagram.tsx`

**Aktuell:** Verschnitt-Rechtecke mit einfarbigem Rosa (`#fce7f3`, 85% Opazität) und gestricheltem Rand.

**Neu:** Rosa Hintergrund + diagonale Schraffur (konsistent mit dem Anschnitt-Stil).

| Eigenschaft | Wert |
|---|---|
| Hintergrund | `#fce7f3`, `fillOpacity="0.6"` |
| Schraffur-Pattern | 45° gedreht, `stroke="#e11d48"`, `strokeWidth="1.5"`, `strokeOpacity="0.35"` |
| Rand | `stroke="#f9a8d4"`, gestrichelt (`strokeDasharray="20 8"`), `strokeWidth="3"` |
| Label "Rest" | `fill="#be185d"` (unverändert) |
| Maße | `fill="#db2777"` (unverändert) |

**Umsetzung:** Neues `<pattern>` Element in `<defs>` (analog zum bestehenden `stripePatternId` für Anschnitt, aber mit Rosa-Farbe). Drei überlagerte `<rect>` pro Verschnitt-Bereich: Hintergrund → Schraffur → Rand.

## 2. Rest-Label in Schnittfolge

**Dateien:** `src/algorithm/guillotine.ts`, `src/components/CutList.tsx`

**Aktuell:** `CutStep.pieceName` ist `undefined` für Schnitte die Restfläche erzeugen. CutList zeigt `—`.

**Neu:** `generateCutSequence` berechnet die Restflächen-Maße und setzt `pieceName` auf `"Rest {breite}×{höhe} mm"`.

### Änderungen an `CutStep` (types oder inline in guillotine.ts)

Kein neues Typ-Feld nötig — `pieceName` wird einfach mit dem Rest-String befüllt statt `undefined` zu bleiben.

### Logik in `generateCutSequence`

Für jeden Schnitt, der keinen benannten Teil erzeugt: die Dimensionen der entstehenden Restfläche berechnen (aus `panelWidth`/`panelHeight` minus Position des Schnitts) und als `"Rest {w}×{h} mm"` in `pieceName` setzen. Die Maße sind in Algorithmus-Raum (Breite × Höhe), nicht transponiert — CutList zeigt sie direkt an.

### CutList-Änderung

Fallback `step.pieceName ?? '—'` bleibt als Safety-Net, wird aber normalerweise nicht mehr ausgelöst.

## 3. Dimension-Annotations unten + rechts

**Datei:** `src/components/CutDiagram.tsx`

**Aktuell:** L-Bemaßung oben, B-Bemaßung links. Grau (`#64748b`), "L = 2440 mm" Format. `marginLeft=110`, `marginTop=70`, viewBox beginnt bei `(-marginLeft, -marginTop)`.

**Neu:**

| Eigenschaft | Wert |
|---|---|
| Position L | **Unten** (unterhalb der Platte) |
| Position B | **Rechts** (rechts neben der Platte) |
| Farbe | Schwarz (`#000`) |
| Linien-Stärke | `strokeWidth="3"` (SVG-Einheiten, wie bestehend) |
| Format | "L 2440" / "B 1220" (ohne "mm", ohne "=") |
| Text-Platzierung | Zentriert auf der Bemaßungslinie (Linie unterbrochen, weißer Hintergrund-Rect dahinter) |
| B-Rotation | −90° (von oben nach unten lesbar) |

### ViewBox-Anpassung

- `marginLeft` und `marginTop` entfallen (werden 0)
- Neue Margins: `marginBottom ≈ 70`, `marginRight ≈ 110` (SVG-Einheiten)
- viewBox: `0 0 (svgW + marginRight) (svgH + marginBottom)`
- `displayH` Berechnung entsprechend anpassen

### SVG-Struktur

```
<!-- L-Bemaßung unten -->
<line x1="0" y1="svgH+offset" x2="textStart" y2="svgH+offset"/>   (linker Teil)
<line x1="textEnd" y1="svgH+offset" x2="svgW" y2="svgH+offset"/> (rechter Teil)
<line x1="0" Endstrich links/>
<line x1="svgW" Endstrich rechts/>
<rect fill="white" hinter Text/>
<text "L {svgW}"/>

<!-- B-Bemaßung rechts -->
<line x1="svgW+offset" y1="0" x2="svgW+offset" y2="textStart"/>  (oberer Teil)
<line x1="svgW+offset" y1="textEnd" x2="svgW+offset" y2="svgH"/> (unterer Teil)
<line Endstrich oben/>
<line Endstrich unten/>
<rect fill="white" hinter Text/>
<text "B {svgH}" transform="rotate(-90, ...)"/>
```

## Nicht geändert

- **SheetStats Navigation** — bleibt als einklappbare Sektionen
- **Farbpalette der Teile** — unverändert
- **Anschnitt-Darstellung** — unverändert (bernstein)
- **Tooltip-Verhalten** — unverändert

## Verifikation

1. `npm run test` — alle bestehenden Tests müssen weiter bestehen
2. `npm run build` — TypeScript + Vite ohne Fehler
3. Visuell prüfen:
   - Verschnitt-Bereiche haben Rosa-Schraffur
   - Schnittfolge zeigt "Rest {w}×{h} mm" statt "—"
   - Bemaßung unten + rechts, schwarz, Text auf der Linie
   - Anschnitt-Streifen weiterhin korrekt (bernstein)
   - Mobile Ansicht: Bemaßung nicht abgeschnitten
