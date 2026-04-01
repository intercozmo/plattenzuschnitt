// src/components/CutDiagram.tsx
import { useRef, useState } from 'react'
import type { PlacedPlate, CutPiece } from '../types'
import { useResizeObserver } from '../hooks/useResizeObserver'

interface Props {
  plate: PlacedPlate
  pieceColorMap: Map<string, string>
  kerf: number
  trimLeft: number
  trimTop: number
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

// Convert algorithm-space rect to display-space rect
function toDisplayRect(
  ax: number, ay: number, aw: number, ah: number,
  transposed: boolean
): { x: number; y: number; w: number; h: number } {
  if (transposed) return { x: ay, y: ax, w: ah, h: aw }
  return { x: ax, y: ay, w: aw, h: ah }
}

export default function CutDiagram({ plate, pieceColorMap, kerf, trimLeft, trimTop }: Props) {
  const [scale, setScale] = useState(1)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const lastDist = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: containerWidth } = useResizeObserver(containerRef as React.RefObject<HTMLElement>)

  // Transposition: if height > width, show height as the horizontal dimension
  const transposed = plate.stock.height > plate.stock.width
  const svgW = transposed ? plate.stock.height : plate.stock.width
  const svgH = transposed ? plate.stock.width : plate.stock.height

  const displayW = containerWidth || 400
  const displayH = (svgH / svgW) * displayW

  // In display space, trimLeft is always the left strip and trimTop is always the top strip
  // (they are already in display coordinates)
  const displayTrimLeft = trimLeft
  const displayTrimTop = trimTop

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

  // Compute kerf lines (deduplicated) — these are in algorithm space
  const kerfXSet = new Set<number>()
  const kerfYSet = new Set<number>()
  if (kerf > 0) {
    for (const p of plate.placements) {
      const pw = p.rotated ? p.piece.height : p.piece.width
      const ph = p.rotated ? p.piece.width : p.piece.height
      const rightEdge = p.x + pw
      const bottomEdge = p.y + ph
      if (rightEdge < plate.stock.width) {
        kerfXSet.add(rightEdge)
      }
      if (bottomEdge < plate.stock.height) {
        kerfYSet.add(bottomEdge)
      }
    }
  }
  const kerfXLines = Array.from(kerfXSet)
  const kerfYLines = Array.from(kerfYSet)

  // Stripe pattern for trim strips
  const stripePatternId = `trim-stripe-${plate.stock.id}-${plate.plateIndex}`

  return (
    <div className="relative">
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
          <defs>
            <pattern id={stripePatternId} patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="#f59e0b" strokeWidth="12" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Plate background */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#fefce8" stroke="#78350f" strokeWidth={12} />

          {/* Waste rectangles (transposed) */}
          {wasteRects.map((wr, i) => {
            const { x, y, w, h } = toDisplayRect(wr.x, wr.y, wr.width, wr.height, transposed)
            return (
              <g key={`waste-${i}`}>
                <rect
                  x={x} y={y}
                  width={w} height={h}
                  fill="#e2e8f0"
                  stroke="#94a3b8"
                  strokeWidth={3}
                  strokeDasharray="20 8"
                  fillOpacity={0.6}
                />
                {w > 100 && h > 60 && (
                  <>
                    <text x={x + w / 2} y={y + h / 2 - 20}
                      textAnchor="middle" fontSize={40} fill="#94a3b8">Rest</text>
                    <text x={x + w / 2} y={y + h / 2 + 30}
                      textAnchor="middle" fontSize={34} fill="#b0b8c4">
                      {w}×{h}
                    </text>
                  </>
                )}
              </g>
            )
          })}

          {/* Pieces */}
          {plate.placements.map((p, i) => {
            const pw_algo = p.rotated ? p.piece.height : p.piece.width
            const ph_algo = p.rotated ? p.piece.width : p.piece.height
            const { x: dx, y: dy, w: dw, h: dh } = toDisplayRect(p.x, p.y, pw_algo, ph_algo, transposed)
            const color = pieceColorMap.get(p.piece.id) ?? '#94a3b8'
            const labelFits = dh >= 30
            const large = dw > 150 && dh > 80
            return (
              <g key={i} onClick={e => { e.stopPropagation(); setTooltip({ piece: p.piece }) }}
                style={{ cursor: 'pointer' }}>
                <rect x={dx} y={dy} width={dw} height={dh}
                  fill={color} fillOpacity={0.8} stroke="#1e293b" strokeWidth={4} />
                {labelFits && large && (
                  <>
                    <text x={dx + dw / 2} y={dy + dh / 2 - 30}
                      textAnchor="middle" fontSize={50} fontWeight="600" fill="#1e293b">
                      {p.piece.name}
                    </text>
                    <text x={dx + dw / 2} y={dy + dh / 2 + 30}
                      textAnchor="middle" fontSize={40} fill="#334155">
                      {dw}×{dh}
                    </text>
                    {dw > 80 && (
                      <text x={dx + dw / 2} y={dy + 28}
                        textAnchor="middle" fontSize={28} fill="#1e293b">
                        {dw} mm
                      </text>
                    )}
                    {dh > 80 && (
                      <text
                        x={dx + 28} y={dy + dh / 2}
                        textAnchor="middle" fontSize={28} fill="#1e293b"
                        transform={`rotate(-90, ${dx + 28}, ${dy + dh / 2})`}>
                        {dh} mm
                      </text>
                    )}
                  </>
                )}
                {labelFits && !large && (
                  <text x={dx + dw / 2} y={dy + dh / 2}
                    textAnchor="middle" dominantBaseline="middle" fontSize={36} fontWeight="600" fill="#1e293b">
                    {p.piece.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Kerf lines — converted to display space */}
          {kerfXLines.map(algX => {
            // algo X (vertical cut in algo space)
            // if transposed: algo_x maps to display_y → horizontal line
            // if not transposed: vertical line at x=algX
            if (transposed) {
              return (
                <line key={`kx-${algX}`}
                  x1={0} y1={algX} x2={svgW} y2={algX}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )
            } else {
              return (
                <line key={`kx-${algX}`}
                  x1={algX} y1={0} x2={algX} y2={svgH}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )
            }
          })}
          {kerfYLines.map(algY => {
            // algo Y (horizontal cut in algo space)
            // if transposed: algo_y maps to display_x → vertical line
            // if not transposed: horizontal line at y=algY
            if (transposed) {
              return (
                <line key={`ky-${algY}`}
                  x1={algY} y1={0} x2={algY} y2={svgH}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )
            } else {
              return (
                <line key={`ky-${algY}`}
                  x1={0} y1={algY} x2={svgW} y2={algY}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )
            }
          })}

          {/* Trim strips (always in display space) */}
          {displayTrimLeft > 0 && (
            <g>
              <rect x={0} y={0} width={displayTrimLeft} height={svgH}
                fill={`url(#${stripePatternId})`}
                stroke="#f59e0b" strokeWidth={4}
              />
              <rect x={0} y={0} width={displayTrimLeft} height={svgH}
                fill="#fbbf24" fillOpacity={0.25}
              />
              {displayTrimLeft > 60 && svgH > 120 && (
                <text
                  x={displayTrimLeft / 2} y={svgH / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={32} fill="#92400e" fontWeight="600"
                  transform={`rotate(-90, ${displayTrimLeft / 2}, ${svgH / 2})`}>
                  Anschnitt
                </text>
              )}
              {kerf > 0 && (
                <line
                  x1={displayTrimLeft} y1={0} x2={displayTrimLeft} y2={svgH}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )}
            </g>
          )}
          {displayTrimTop > 0 && (
            <g>
              <rect x={0} y={0} width={svgW} height={displayTrimTop}
                fill={`url(#${stripePatternId})`}
                stroke="#f59e0b" strokeWidth={4}
              />
              <rect x={0} y={0} width={svgW} height={displayTrimTop}
                fill="#fbbf24" fillOpacity={0.25}
              />
              {svgW > 120 && displayTrimTop > 60 && (
                <text
                  x={svgW / 2} y={displayTrimTop / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={32} fill="#92400e" fontWeight="600">
                  Anschnitt
                </text>
              )}
              {kerf > 0 && (
                <line
                  x1={0} y1={displayTrimTop} x2={svgW} y2={displayTrimTop}
                  stroke="red" strokeWidth={3} strokeDasharray="20,10" opacity={0.5}
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Dimension labels outside SVG */}
      <div className="flex justify-between items-center mt-1 px-1">
        <p className="text-xs text-slate-500">
          L {plate.stock.height} mm × B {plate.stock.width} mm
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
