// src/components/Header.tsx
import { useMediaQuery } from '../hooks/useMediaQuery'
import ProjectMenu from './ProjectMenu'

interface Props {
  onCompute: () => void
  canCompute: boolean
  onProjectChange: () => void
}

export default function Header({ onCompute, canCompute, onProjectChange }: Props) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className={`shrink-0 font-bold ${isDesktop ? 'text-xl' : 'text-base'}`}>
          Plattenzuschnitt
        </h1>
        <ProjectMenu onProjectChange={onProjectChange} />
      </div>
      <button
        type="button"
        onClick={onCompute}
        disabled={!canCompute}
        title="Strg+Enter"
        className={`
          shrink-0 whitespace-nowrap rounded-lg font-semibold transition-colors
          ${isDesktop ? 'px-5 py-2 text-sm' : 'px-3 py-1.5 text-xs'}
          ${canCompute
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isDesktop
          ? <>Schnittplan berechnen <span aria-hidden="true">⚡</span></>
          : <>Berechnen <span aria-hidden="true">⚡</span></>
        }
      </button>
    </header>
  )
}
