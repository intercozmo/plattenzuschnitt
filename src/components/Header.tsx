// src/components/Header.tsx
import { useMediaQuery } from '../hooks/useMediaQuery'

interface Props {
  onCompute: () => void
  canCompute: boolean
}

export default function Header({ onCompute, canCompute }: Props) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3">
      <h1 className={`font-bold ${isDesktop ? 'text-xl' : 'text-base'}`}>
        Plattenzuschnitt
      </h1>
      <button
        type="button"
        onClick={onCompute}
        disabled={!canCompute}
        className={`
          rounded-lg font-semibold transition-colors
          ${isDesktop ? 'px-5 py-2 text-sm' : 'px-3 py-1.5 text-xs'}
          ${canCompute
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isDesktop ? 'Schnittplan berechnen ⚡' : 'Berechnen ⚡'}
      </button>
    </header>
  )
}
