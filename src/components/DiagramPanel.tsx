// src/components/DiagramPanel.tsx
import { useState, useRef, useMemo } from 'react'
import { COLOR_PALETTE } from '../constants'
import CutDiagram from './CutDiagram'
import type { CutPlan, PlacedPlate } from '../types'

interface Props {
  plan: CutPlan
  kerf: number
  onBack?: () => void
}

function plateKey(plate: PlacedPlate): string {
  return `${plate.stock.id}-${plate.plateIndex}`
}

async function exportPlateAsJpg(svgElement: SVGElement, filename: string) {
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const canvas = document.createElement('canvas')
  canvas.width = svgElement.clientWidth * 2
  canvas.height = svgElement.clientHeight * 2
  const ctx = canvas.getContext('2d')!
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG konnte nicht geladen werden'))
    // Encode SVG for data URI — avoids deprecated unescape() for Unicode safety
    const encoded = encodeURIComponent(svgData)
    img.src = 'data:image/svg+xml,' + encoded
  })

  ctx.scale(2, 2)
  ctx.drawImage(img, 0, 0)
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/jpeg', 0.92)
}

export default function DiagramPanel({ plan, kerf, onBack }: Props) {
  // Build color map from all placements across all plates
  const pieceColorMap = useMemo(() => {
    const map = new Map<string, string>()
    plan.plates.forEach(plate => {
      plate.placements.forEach(p => {
        if (!map.has(p.piece.id)) {
          map.set(p.piece.id, COLOR_PALETTE[map.size % COLOR_PALETTE.length])
        }
      })
    })
    return map
  }, [plan])

  // Selected plates state (all selected by default)
  const allKeys = plan.plates.map(plateKey)
  const [selectedPlates, setSelectedPlates] = useState<Set<string>>(new Set(allKeys))

  // Refs for SVG elements (for JPG export)
  const svgRefs = useRef<Map<string, SVGElement>>(new Map())

  const allSelected = selectedPlates.size === plan.plates.length
  const noneSelected = selectedPlates.size === 0
  const someSelected = !allSelected && !noneSelected

  function toggleAll() {
    if (allSelected) {
      setSelectedPlates(new Set())
    } else {
      setSelectedPlates(new Set(allKeys))
    }
  }

  function togglePlate(key: string) {
    setSelectedPlates(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleJpgExport() {
    try {
      const selectedEntries = plan.plates.filter(p => selectedPlates.has(plateKey(p)))
      if (selectedEntries.length === 0) {
        alert('Keine Platten ausgewählt.')
        return
      }
      for (let i = 0; i < selectedEntries.length; i++) {
        const plate = selectedEntries[i]
        const key = plateKey(plate)
        const svgEl = svgRefs.current.get(key)
        if (!svgEl) continue
        const filename = `platte-${plate.plateIndex + 1}-${plate.stock.label}.jpg`
        await exportPlateAsJpg(svgEl, filename)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim JPG-Export'
      alert(message)
    }
  }

  function handlePdfExport() {
    alert('PDF-Export noch nicht verfügbar. Nutzen Sie "Drucken" als Alternative.')
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Export controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border-b">
        {onBack && (
          <button
            onClick={onBack}
            className="text-slate-600 text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100"
          >
            ← Zurück
          </button>
        )}
        <span className="flex-1" />
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
        >
          Drucken
        </button>
        <button
          onClick={handleJpgExport}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
        >
          JPG exportieren
        </button>
        <button
          onClick={handlePdfExport}
          className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
        >
          PDF exportieren
        </button>
      </div>

      {/* "Alle" checkbox */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
        <input
          type="checkbox"
          id="alle-checkbox"
          checked={allSelected}
          ref={el => {
            if (el) el.indeterminate = someSelected
          }}
          onChange={toggleAll}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="alle-checkbox" className="text-sm font-medium text-slate-700 cursor-pointer">
          Alle ({plan.plates.length} {plan.plates.length === 1 ? 'Platte' : 'Platten'})
        </label>
      </div>

      {/* Plate list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plan.plates.length === 0 && (
          <p className="text-slate-500 text-center py-8">Keine Platten im Schnittplan.</p>
        )}
        {plan.plates.map((plate, idx) => {
          const key = plateKey(plate)
          const isSelected = selectedPlates.has(key)
          return (
            <div
              key={key}
              className={`rounded-lg overflow-hidden ${isSelected ? 'border-2 border-blue-500' : 'border border-slate-200'}`}
            >
              {/* Plate header with checkbox */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                <input
                  type="checkbox"
                  id={`plate-${key}`}
                  checked={isSelected}
                  onChange={() => togglePlate(key)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label
                  htmlFor={`plate-${key}`}
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Platte {idx + 1}: {plate.stock.width}×{plate.stock.height} mm
                  <span className="text-slate-400 font-normal ml-1">({plate.stock.label})</span>
                </label>
              </div>

              {/* CutDiagram */}
              <div
                className="p-3"
                ref={el => {
                  // Capture the SVG element for export
                  if (el) {
                    const svg = el.querySelector('svg')
                    if (svg) {
                      svgRefs.current.set(key, svg as SVGElement)
                    }
                  }
                }}
              >
                <CutDiagram
                  plate={plate}
                  pieceColorMap={pieceColorMap}
                  kerf={kerf}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
