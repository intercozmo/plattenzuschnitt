# Single-Screen-Layout Redesign

**Version:** 1.0
**Datum:** 2026-03-29
**Status:** Finalisiert
**App-Version vorher:** 0.1.0 (3-Screen-Wizard)
**App-Version nachher:** 0.2.0 (Single-Screen-Layout)
**Mockup:** `.superpowers/brainstorm/1436-1774783320/content/app-mockup.html`

## Kontext

Die aktuelle App nutzt einen 3-Screen-Wizard (Plattenbestand -> Stückliste -> Ergebnis) mit fester max-w-lg Breite (512px). Das funktioniert auf Mobile, verschwendet aber Desktop-Platz und fühlt sich nicht wie ein professionelles Tool an. Vorbild ist cutlistoptimizer.com — alles auf einem Screen, drei Spalten, Inline-Editing.

## Layout

### Desktop (>= 1024px): CSS Grid 3 Spalten

```
grid-template-columns: 280px 1fr 300px
```

- **Linke Sidebar (280px):** Eingabe — Plattenbestand, Stückliste, Optionen (alle einklappbar)
- **Mitte (flexibel):** Schnittdiagramm (SVG, dynamische Breite)
- **Rechte Sidebar (300px):** Ergebnis — Gesamtstatistik, Plattenstatistik, Schnittfolge

Header oben mit App-Name und "Berechnen"-Button.

### Mobile (< 1024px): Bottom-Tabs

Drei Tabs fixiert am unteren Rand:
- **Eingabe:** Plattenbestand + Stückliste + Optionen vertikal gestapelt + Berechnen-Button
- **Diagramm:** SVG volle Breite mit Pinch-Zoom + Platte-Navigation
- **Ergebnis:** Statistiken + Schnittfolge volle Breite

Kompakter Header: App-Name + Berechnen-Button.

## Inline-Tabellen

Beide Tabellen (Plattenbestand, Stückliste) nutzen dasselbe Muster:

### Spalten

**Plattenbestand:** Länge | Breite | Anz | Label | Aktionen (✎ ✕)

**Stückliste:** Länge | Breite | Anz | Name | Maserung | Aktionen (✎ ✕)

Maserung als Icon: `─` (längs), `│` (quer), `◦` (keine)

### Interaktion

- **Lese-Modus:** Werte als Text, ✎ und ✕ Buttons am rechten Rand
- **Edit-Modus:** Klick auf ✎ oder Doppelklick auf Zeile verwandelt Felder in Inputs
- **Speichern:** Enter oder ✓ Button
- **Abbrechen:** Escape oder ✕ Button
- **Tab:** Springt zum nächsten Feld
- **Hinzufügen:** Button unter Tabelle fügt leere Zeile im Edit-Modus ein
- **Constraint:** Nur eine Zeile gleichzeitig im Edit-Modus

### Validierung

- Breite/Höhe > 0
- Anzahl >= 1
- Label/Name nicht leer

## CSV-Import (Stückliste)

### Auslöser
- **Button:** Import-Icon im Stückliste-Sektions-Header — öffnet nativen Datei-Dialog (accept=".csv")
- **Drag & Drop:** CSV-Datei auf die Stückliste-Tabelle ziehen (visuelles Feedback: Rahmen wird blau/gestrichelt)

### CSV-Format
Flexibel mit Header-Erkennung:
- Erste Zeile muss Spaltennamen enthalten
- Erkannte Spaltennamen (case-insensitive): `length`/`länge`, `width`/`breite`, `qty`/`quantity`/`anzahl`/`menge`, `name`/`label`, `grain`/`maserung`
- Trennzeichen wird automatisch erkannt: Semikolon (`;`) oder Komma (`,`)
- Nicht erkannte Spalten werden ignoriert
- Fehlende optionale Spalten (Name, Maserung) bekommen Standardwerte: Name = "Teil N", Maserung = "keine"

### Import-Verhalten
- Nach dem Parsen wird ein Dialog angezeigt: "X Stücke erkannt. Bestehende Stücke ersetzen oder hinzufügen?"
- Zwei Buttons: `[Ersetzen]` `[Hinzufügen]`
- Bei Parsing-Fehlern (ungültige Zahlen, fehlende Pflichtfelder): Fehlermeldung mit Zeilennummer

### Validierung
- Länge und Breite müssen > 0 sein
- Anzahl muss >= 1 sein
- Ungültige Zeilen werden übersprungen und als Warnung angezeigt

## Optionen-Sektion

Einklappbar, enthält:
- Schnittbreite (Kerf) — Zahleneingabe in mm (Standard: 3)
- Maserung beachten — Toggle
- Optimierung — Dropdown mit 3 Optionen:
  - "Wenig Verschnitt" (Standard) — minimiert Verschnittfläche
  - "Wenig Schnitte" — minimiert Anzahl Schnitte (schnellere Bearbeitung)
  - "Ausgewogen" — gewichteter Kompromiss zwischen beiden

## Diagramm-Panel

### Vor Berechnung
Leerer Zustand mit Hinweistext: "Füge Platten und Stücke hinzu, dann klicke Berechnen"

### Nach Berechnung
- SVG-Breite wird dynamisch via ResizeObserver ermittelt (ersetzt hardcodierte 340px)
- Alle Platten untereinander als Scroll-Layout (kein Prev/Next)
- Plattentitel über jedem Diagramm: "Platte 1/3: Buche 2800x2070"
- Gestrichelte Trennlinie zwischen Platten
- Hover/Tap auf Stück zeigt Tooltip (Name, Maße, rotiert?)
- Farbcodierung aus bestehender Farbpalette (`constants.ts`)
- Pinch-Zoom auf Mobile bleibt erhalten
- Schnittlinien (Kerf) als rot gestrichelte Linien dargestellt
- Reststücke/Verschnitt zeigen ihre Maße an (z.B. "Rest 1197x400")

### Export-Optionen
Unterhalb der Platte-Navigation, drei Buttons:
- **Plattenauswahl:** Checkbox an jeder Platte + "Alle" Checkbox oben in der Export-Leiste
  - Selektierte Platten bekommen einen blauen Rahmen (visuelles Feedback)
  - "Alle" Checkbox togglet alle Platten an/aus
- **Drucken:** `window.print()` mit Print-CSS das nur die selektierten Diagramme druckt
- **PDF:** SVG → Canvas → PDF-Download (via canvas `toBlob` + einfachem PDF-Wrapper, oder `jspdf` falls nötig)
- **JPG:** SVG → Canvas → JPG-Download (`toBlob` + Download-Link). Bei mehreren Platten: ZIP oder einzelne Dateien

Export/Druck bezieht sich auf die per Checkbox selektierten Platten.

## Ergebnis-Panel

### Gesamtstatistik
- Platten verwendet (x / y)
- Genutzte Fläche (%)
- Verschnitt (%)
- Schnittbreite (mm)
- Gesamtschnittlänge (m)

### Plattenstatistik
Pro Platte ein einklappbarer Block (alle Platten untereinander, passend zum Scroll-Layout):
- Typ (Label + Maße)
- Genutzte Fläche (mm² + %)
- Verschnitt (mm² + %)
- Anzahl Schnitte
- Anzahl Teile
- Reststücke

### Schnittfolge
Tabelle mit Spalten: # | Platte | Schnitt | Ergebnis
- Alle Platten in einer Tabelle, gruppiert nach Platte
- Format wie CutList Optimizer (Panelmaße, Schnittrichtung/-position, Ergebnisstück)

## Algorithmus-Umbau

### Problem mit aktuellem Ansatz
Der aktuelle BSSF-Algorithmus trackt freie Rechtecke und platziert Stücke darin. Die resultierende `generateCutSequence` sammelt nur flache X/Y-Positionen — das ergibt keine realistische Schnittfolge. In der Praxis muss jeder Sägeschnitt durch die gesamte aktuelle Teilplatte verlaufen.

### Strikter Guillotine-Algorithmus
Jede Platte wird rekursiv durch Guillotine-Schnitte unterteilt:

1. Platziere ein Stück in der Ecke (oben-links) einer Teilplatte
2. Wähle Schnittrichtung (horizontal-first oder vertical-first):
   - **Horizontal-first:** Horizontaler Schnitt bei Stück-Höhe → oberer Streifen + untere Restplatte
   - **Vertical-first:** Vertikaler Schnitt bei Stück-Breite → linker Streifen + rechte Restplatte
3. Rekursiv: Platziere weitere Stücke in den entstandenen Teilplatten
4. Probiere beide Schnittrichtungen und wähle die bessere (nach Priorität)

Der Algorithmus produziert einen **Schnittbaum** statt einer flachen Liste:
```
Platte 2800×2070
├── Schnitt horizontal bei y=400
│   ├── Oberer Streifen 2800×400 → [Seite, Seite, Seite, ...]
│   └── Schnitt horizontal bei y=800
│       ├── Streifen 2800×400 → [Seite, Seite, ...]
│       └── Restplatte 2800×1270 → [Boden, Boden, ...]
```

### Rotation
Bereits implementiert: Stücke mit `grain='any'` werden in beiden Orientierungen getestet. Stücke mit `grain='horizontal'` oder `grain='vertical'` werden nicht gedreht. Dies bleibt unverändert.

### Optimierungspriorität
Die Scoring-Funktion im Algorithmus wird durch die Priorität gesteuert:

- **"Wenig Verschnitt":** Score = platzierte Fläche / Gesamtfläche (BSSF-ähnlich, tightest fit bevorzugt)
- **"Wenig Schnitte":** Score bevorzugt Platzierungen die Regalreihen bilden (gleiche Höhe gruppiert → weniger horizontale Schnitte). Stücke werden nach Höhe vorsortiert.
- **"Ausgewogen":** Gewichteter Score: 60% Verschnitt + 40% Schnittminimierung

### Schnittfolge-Ausgabe
`generateCutSequence` wird ersetzt durch eine Funktion die den Schnittbaum traversiert und eine flache, geordnete Schnittliste erzeugt:
- Jeder Schritt: Plattengröße → Schnittrichtung + Position → Ergebnisstücke
- Format: `# | Platte (Maße) | Schnitt (x= oder y=) | Ergebnis (Stückname oder Reststück)`

### Tests
- Bestehende Tests werden an den neuen Algorithmus angepasst
- Neue Tests: Schnittbaum-Validierung (jeder Schnitt geht durch volle Breite/Höhe)
- Test: Priorität "Wenig Schnitte" erzeugt weniger Schnitte als "Wenig Verschnitt"
- Test: Rotation nur bei grain='any'

## Einklappbare Sektionen

Alle Sektionen (Plattenbestand, Stückliste, Optionen, Gesamtstatistik, Plattenstatistik, Schnittfolge) sind einklappbar:
- Klick auf Sektions-Header togglet den Inhalt
- Chevron-Icon zeigt Zustand an (▼ offen, ► geschlossen)
- Zustand wird lokal gehalten (kein Persist)

## Was bleibt unverändert

- **Zustand Store** (`store.ts`): Zustand + localStorage Persistenz (wird um Optionen erweitert)
- **Types** (`types.ts`): Bestehende Types bleiben, neue kommen hinzu (CutTree, OptimizationPriority)
- **Constants** (`constants.ts`): Presets, Farbpalette, Limits
- **Persistenz** (`persistence.ts`): localStorage Serialisierung

## Was gelöscht wird

- `screens/StockScreen.tsx` — ersetzt durch inline Tabelle in Sidebar
- `screens/PiecesScreen.tsx` — ersetzt durch inline Tabelle in Sidebar
- `screens/ResultScreen.tsx` — ersetzt durch Ergebnis-Sidebar
- `components/StockForm.tsx` — ersetzt durch Inline-Editing
- `components/PieceForm.tsx` — ersetzt durch Inline-Editing

## Was umgebaut wird

- `App.tsx` — von Wizard-Router zu Single-Screen-Layout
- `components/CutDiagram.tsx` — hardcodierte Breite durch ResizeObserver ersetzen
- `algorithm/guillotine.ts` — Strikter Guillotine mit Schnittbaum + Prioritäts-Scoring
- `algorithm/guillotine.test.ts` — Tests anpassen und erweitern
- `types.ts` — Neue Types: CutTree, OptimizationPriority
- `store.ts` — Optionen-State (kerf, grainEnabled, priority) hinzufügen

## Neue Dateien

- `components/CollapsibleSection.tsx` — wiederverwendbare einklappbare Sektion
- `components/InlineTable.tsx` — wiederverwendbare Inline-Editing-Tabelle
- `components/StockTable.tsx` — Plattenbestand-Tabelle (nutzt InlineTable)
- `components/PiecesTable.tsx` — Stückliste-Tabelle (nutzt InlineTable)
- `components/OptionsPanel.tsx` — Kerf + Maserung-Einstellungen
- `components/InputPanel.tsx` — linke Sidebar (Stock + Pieces + Options)
- `components/GlobalStats.tsx` — Gesamtstatistik
- `components/SheetStats.tsx` — Plattenstatistik mit Navigation
- `components/CutList.tsx` — Schnittfolge-Tabelle
- `components/ResultsPanel.tsx` — rechte Sidebar (Stats + CutList)
- `components/Header.tsx` — App-Header mit Berechnen-Button
- `components/MobileTabBar.tsx` — Bottom-Tab-Navigation
- `hooks/useMediaQuery.ts` — Breakpoint-Detection
- `hooks/useResizeObserver.ts` — Container-Breite für CutDiagram
- `utils/csvImport.ts` — CSV-Parser mit Header-Erkennung und Trennzeichen-Detection

## Verifizierung

1. `npm run build` — TypeScript-Kompilierung ohne Fehler
2. `npm run test` — Algorithmus-Tests (Schnittbaum-Validierung, Prioritäten, Rotation)
3. Desktop-Browser: 3-Spalten-Layout prüfen, Inline-Editing testen, Berechnung auslösen, Diagramm + Statistiken prüfen
4. Browser-Fenster verkleinern (< 1024px): Bottom-Tabs prüfen, alle drei Tabs durchklicken
5. Einklappbare Sektionen auf/zuklappen
6. Alle Platten als Scroll-Layout im Diagramm-Panel prüfen
7. Plattenauswahl-Checkboxen + "Alle" Checkbox testen
8. Export: Drucken/PDF/JPG mit selektierten Platten testen
9. CSV-Import: Datei importieren, Ersetzen/Hinzufügen-Dialog prüfen
10. Optimierungspriorität: alle 3 Modi durchprobieren, Ergebnisse vergleichen

## Abhängigkeiten

### Bestehend (keine Änderung)
- `react` 18.3, `react-dom` 18.3
- `zustand` 5.0
- `nanoid` 5.1
- `vite` 5.4, `tailwindcss` 3.4, `typescript` 5.6
- `vitest` 2.1

### Neu (falls nötig)
- `jspdf` — nur falls SVG→Canvas→PDF nicht nativ ausreicht
- Keine weitere neue Abhängigkeit geplant
