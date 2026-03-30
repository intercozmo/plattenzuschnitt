// src/components/CutDiagram.tsx
import { useRef, useState } from 'react'
import type { PlacedPlate, CutPiece } from '../types'
import { useResizeObserver } from '../hooks/useResizeObserver'

interface Props {
  plate: PlacedPlate
  pieceColorMap: Map<string, string>
  kerf: number
}

interface TooltipState {
  piece: CutPiece
}

interface WasteRect {
  x: number
  y: number
  width: number
  height: number
}

function computeWasteRects(plate: PlacedPlate): WasteRect[] {
  const rects: WasteRect[] = []
  const W = plate.stock.width
  const H = plate.stock.height

  const bands = new Map<number, { y: number; h: number; pieces: Array<{ x: number; w: number }> }>()

  for (const p of plate.placements) {
    const pw = p.rotated ? p.piece.height : p.piece.width
    const ph = p.rotated ? p.piece.width : p.piece.height
    if (!bands.has(p.y)) bands.set(p.y, { y: p.y, h: ph, pieces: [] })
    bands.get(p.y)!.pieces.push({ x: p.x, w: pw })
  }

  let coveredY = 0
  const sortedBands = Array.from(bands.values()).sort((a, b) => a.y - b.y)

  for (const band of sortedBands) {
    if (band.y > coveredY) {
      rects.push({ x: 0, y: coveredY, width: W, height: band.y - coveredY })
    }
    const rightmostX = Math.max(...band.pieces.map(p => p.x + p.w))
    if (rightmostX < W) {
      rects.push({ x: rightmostX, y: band.y, width: W - rightmostX, height: band.h })
    }
    coveredY = band.y + band.h
  }

  if (coveredY < H) {
    rects.push({ x: 0, y: coveredY, width: W, height: H - coveredY })
  }

  return rects
}

export default function CutDiagram({ plate, pieceColorMap, kerf }: Props) {
  const [scale, setScale] = useState(1)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const lastDist = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: containerWidth } = useResizeObserver(containerRef as React.RefObject<HTMLElement>)

  const svgW = plate.stock.width
  const svgH = plate.stock.height
  const displayW = containerWidth || 400
  const displayH = (svgH / svgW) * displayW

  function toDisplay(mm: number) { return (mm / svgW) * displayW }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setScale(s => Math.max(0.5, Math.min(s * (dist / lastDist.current), 5)))
      lastDist.current = dist
    }
  }

  const wasteRects = computeWasteRects(plate)

  // Compute kerf lines (deduplicated)
  const kerfXSet = new Set<number>()
  const kerfYSet = new Set<number>()
  if (kerf > 0) {
    for (const p of plate.placements) {
      const pw = p.rotated ? p.piece.height : p.piece.width
      const ph = p.rotated ? p.piece.width : p.piece.height
      const rightEdge = p.x + pw
      const bottomEdge = p.y + ph
      if (rightEdge < svgW) {
        kerfXSet.add(rightEdge)
      }
      if (bottomEdge < svgH) {
        kerfYSet.add(bottomEdge)
      }
    }
  }
  const kerfXLines = Array.from(kerfXSet)
  const kerfYLines = Array.from(kerfYSet)

  return (
    <div className="relative">
      {/* Dimension label: width above/below */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded border bg-white"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClick={() => setTooltip(null)}
      >
        <svg
          width={displayW}
          height={displayH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }}
        >
          {/* Plate background */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={10} />

          {/* Waste rectangles */}
          {wasteRects.map((wr, i) => (
            <g key={`waste-${i}`}>
              <rect
                x={wr.x} y={wr.y}
                width={wr.width} height={wr.height}
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth={3}
                strokeDasharray="20 8"
                fillOpacity={0.6}
              />
              {wr.width > 100 && wr.height > 60 && (
                <>
                  <text x={wr.x + wr.width / 2} y={wr.y + wr.height / 2 - 20}
                    textAnchor="middle" fontSize={40} fill="#94a3b8">Rest</text>
                  <text x={wr.x + wr.width / 2} y={wr.y + wr.height / 2 + 30}
                    textAnchor="middle" fontSize={34} fill="#b0b8c4">
                    {wr.width}×{wr.height}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Pieces */}
          {plate.placements.map((p, i) => {
            const pw = p.rotated ? p.piece.height : p.piece.width
            const ph = p.rotated ? p.piece.width : p.piece.height
            const color = pieceColorMap.get(p.piece.id) ?? '#94a3b8'
            const labelFits = toDisplay(ph) >= 30
            return (
              <g key={i} onClick={e => { e.stopPropagation(); setTooltip({ piece: p.piece }) }}
                style={{ cursor: 'pointer' }}>
                <rect x={p.x} y={p.y} width={pw} height={ph}
                  fill={color} fillOpacity={0.8} stroke="#1e293b" strokeWidth={4} />
                {labelFits && (
                  <>
                    <text x={p.x + pw / 2} y={p.y + ph / 2 - 30}
                      textAnchor="middle" fontSize={50} fontWeight="600" fill="#1e293b">
                      {p.piece.name}
                    </text>
                    <text x={p.x + pw / 2} y={p.y + ph / 2 + 30}
                      textAnchor="middle" fontSize={40} fill="#334155">
                      {pw}×{ph}
                    </text>
                    {pw > 80 && (
                      <text x={p.x + pw / 2} y={p.y + 28}
                        textAnchor="middle" fontSize={28} fill="#1e293b">
                        {pw} mm
                      </text>
                    )}
                    {ph > 80 && (
                      <text
                        x={p.x + 28} y={p.y + ph / 2}
                        textAnchor="middle" fontSize={28} fill="#1e293b"
                        transform={`rotate(-90, ${p.x + 28}, ${p.y + ph / 2})`}>
                        {ph} mm
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          })}

          {/* Kerf vertical lines (at right edge of pieces, spanning full plate height) */}
          {kerfXLines.map(x => (
            <line
              key={`kx-${x}`}
              x1={x} y1={0} x2={x} y2={svgH}
              stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
            />
          ))}

          {/* Kerf horizontal lines (at bottom edge of pieces, spanning full plate width) */}
          {kerfYLines.map(y => (
            <line
              key={`ky-${y}`}
              x1={0} y1={y} x2={svgW} y2={y}
              stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
            />
          ))}
        </svg>
      </div>

      {/* Dimension labels outside SVG */}
      <div className="flex justify-between items-center mt-1 px-1">
        <p className="text-xs text-slate-500">
          {plate.stock.width} × {plate.stock.height} mm
        </p>
        <p className="text-xs text-slate-500">
          Verschnitt: {plate.wastePct.toFixed(1)}%
        </p>
      </div>

      {tooltip && (
        <div className="absolute top-2 left-2 bg-slate-800 text-white text-sm rounded px-3 py-2 z-10">
          <strong>{tooltip.piece.name}</strong><br />
          {tooltip.piece.width}×{tooltip.piece.height} mm
        </div>
      )}
    </div>
  )
}
