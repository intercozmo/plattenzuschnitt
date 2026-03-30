// src/App.tsx
import { useState } from 'react'
import { useStore } from './store'
import { computeCutPlan } from './algorithm/guillotine'
import { MAX_TOTAL_PIECES } from './constants'
import { useMediaQuery } from './hooks/useMediaQuery'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import DiagramPanel from './components/DiagramPanel'
import ResultsPanel from './components/ResultsPanel'
import MobileTabBar from './components/MobileTabBar'
import type { CutPlan } from './types'

type Tab = 'eingabe' | 'diagramm' | 'ergebnis'

function EmptyDiagramState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <p className="text-slate-400 text-center text-sm">
        Schnittplan berechnen, um das Diagramm anzuzeigen
      </p>
    </div>
  )
}

function EmptyResultsState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <p className="text-slate-400 text-center text-sm">
        Ergebnisse erscheinen nach der Berechnung
      </p>
    </div>
  )
}

export default function App() {
  const [plan, setPlan] = useState<CutPlan | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('eingabe')

  const { cutPieces, stockPlates, kerf } = useStore()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const totalPieces = cutPieces.reduce((s, p) => s + p.quantity, 0)
  const canCompute = cutPieces.length > 0 && stockPlates.length > 0 && totalPieces <= MAX_TOTAL_PIECES

  function handleCompute() {
    const { stockPlates, cutPieces, kerf, priority } = useStore.getState()
    const newPlan = computeCutPlan(stockPlates, cutPieces, kerf, priority)
    setPlan(newPlan)
    if (!isDesktop) setActiveTab('diagramm')
  }

  if (isDesktop) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <Header onCompute={handleCompute} canCompute={canCompute} />
        <div className="grid grid-cols-[280px_1fr_300px] h-[calc(100vh-52px)] overflow-hidden">
          <aside className="overflow-y-auto border-r border-slate-200 bg-white">
            <InputPanel />
          </aside>
          <main className="overflow-y-auto bg-slate-50">
            {plan ? <DiagramPanel plan={plan} kerf={kerf} /> : <EmptyDiagramState />}
          </main>
          <aside className="overflow-y-auto border-l border-slate-200 bg-white">
            {plan ? <ResultsPanel plan={plan} kerf={kerf} /> : <EmptyResultsState />}
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header onCompute={handleCompute} canCompute={canCompute} />
      <div className="h-[calc(100vh-52px-48px)] overflow-hidden">
        {activeTab === 'eingabe' && (
          <div className="h-full overflow-y-auto bg-white">
            <InputPanel />
          </div>
        )}
        {activeTab === 'diagramm' && (
          <div className="h-full overflow-y-auto bg-slate-50">
            {plan ? <DiagramPanel plan={plan} kerf={kerf} /> : <EmptyDiagramState />}
          </div>
        )}
        {activeTab === 'ergebnis' && (
          <div className="h-full overflow-y-auto bg-white">
            {plan ? <ResultsPanel plan={plan} kerf={kerf} /> : <EmptyResultsState />}
          </div>
        )}
      </div>
      <MobileTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
