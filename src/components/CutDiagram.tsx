// src/components/CutDiagram.tsx
import { useRef, useState } from 'react'
import type { PlacedPlate, CutPiece } from '../types'

interface Props {
  plate: PlacedPlate
  pieceColorMap: Map<string, string>
}

interface TooltipState {
  piece: CutPiece
}

export default function CutDiagram({ plate, pieceColorMap }: Props) {
  const [scale, setScale] = useState(1)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const lastDist = useRef(0)

  const svgW = plate.stock.width
  const svgH = plate.stock.height
  const displayW = 340
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

  return (
    <div className="relative">
      <div className="overflow-hidden rounded border bg-white"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onClick={() => setTooltip(null)}>
        <svg width={displayW} height={displayH} viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }}>
          <rect x={0} y={0} width={svgW} height={svgH} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={10} />
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
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      {tooltip && (
        <div className="absolute top-2 left-2 bg-slate-800 text-white text-sm rounded px-3 py-2 z-10">
          <strong>{tooltip.piece.name}</strong><br />
          {tooltip.piece.width}×{tooltip.piece.height} mm
        </div>
      )}
      <p className="text-xs text-slate-500 mt-1 text-right">
        Verschnitt: {plate.wastePct.toFixed(1)}%
      </p>
    </div>
  )
}
