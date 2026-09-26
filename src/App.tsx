// src/App.tsx
import { useState, useCallback, useEffect } from 'react'
import { useStore } from './store'
import { MAX_TOTAL_PIECES } from './constants'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useComputeWorker } from './hooks/useComputeWorker'
import type { ComputeRequest } from './algorithm/computeRequest'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import DiagramPanel from './components/DiagramPanel'
import ResultsPanel from './components/ResultsPanel'
import MobileTabBar from './components/MobileTabBar'
import PrintSheet, { LinearPrintSheet } from './components/PrintSheet'
import ModeToggle from './components/ModeToggle'
import LinearInputPanel from './components/LinearInputPanel'
import LinearDiagram from './components/LinearDiagram'
import LinearResults from './components/LinearResults'
import type { CutPlan, LinearPlan } from './types'

export interface PieceHighlight {
  plateNumber: number   // 1-based plate number
  pieceX: number        // algorithm-space x of placement
  pieceY: number        // algorithm-space y of placement
}

type Tab = 'eingabe' | 'diagramm' | 'ergebnis'

function EmptyDiagramState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <p className="text-slate-400 text-center text-sm">
        {text}
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
  const [linearPlan, setLinearPlan] = useState<LinearPlan | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('eingabe')
  const [highlight, setHighlight] = useState<PieceHighlight | null>(null)
  const onHighlight = useCallback((h: PieceHighlight | null) => setHighlight(h), [])

  const { cutPieces, stockPlates, kerf, trimLeft, trimTop, mode, stockBars, linearParts, linearTrim } = useStore()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { compute, cancel, computing } = useComputeWorker()

  const totalPieces = cutPieces.reduce((s, p) => s + p.quantity, 0)
  const canCompute = mode === '1d'
    ? linearParts.length > 0 && stockBars.length > 0
    : cutPieces.length > 0 && stockPlates.length > 0 && totalPieces <= MAX_TOTAL_PIECES

  async function handleCompute() {
    const s = useStore.getState()
    const request: ComputeRequest = s.mode === '1d'
      ? { mode: '1d', stockBars: s.stockBars, linearParts: s.linearParts, kerf: s.kerf, linearTrim: s.linearTrim }
      : {
          mode: '2d', stockPlates: s.stockPlates, cutPieces: s.cutPieces, kerf: s.kerf,
          priority: s.priority, grainEnabled: s.grainEnabled, trimLeft: s.trimLeft, trimTop: s.trimTop,
        }
    try {
      const result = await compute(request)
      if (!result) return  // cancelled
      if (result.mode === '1d') setLinearPlan(result.plan)
      else setPlan(result.plan)
      // On mobile show the results first when something could not be placed
      if (!isDesktop) setActiveTab(result.plan.shortage ? 'ergebnis' : 'diagramm')
    } catch (err) {
      alert(`Berechnung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Ctrl+Enter / Cmd+Enter computes from anywhere
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canCompute && !computing) {
        e.preventDefault()
        handleCompute()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function handleProjectChange() {
    cancel()
    setPlan(null)
    setLinearPlan(null)
  }

  const is1d = mode === '1d'
  const inputPanel = (
    <>
      <ModeToggle />
      {is1d ? <LinearInputPanel /> : <InputPanel />}
    </>
  )
  const diagramContent = is1d
    ? (linearPlan ? <LinearDiagram plan={linearPlan} kerf={kerf} trimStart={linearTrim} /> : <EmptyDiagramState text={computing ? 'Berechnung läuft …' : 'Füge Stangen und Teile hinzu, dann klicke Berechnen'} />)
    : (plan ? <DiagramPanel plan={plan} kerf={kerf} trimLeft={trimLeft} trimTop={trimTop} highlight={highlight} onHighlight={onHighlight} /> : <EmptyDiagramState text={computing ? 'Berechnung läuft …' : 'Füge Platten und Stücke hinzu, dann klicke Berechnen'} />)
  const resultsContent = is1d
    ? (linearPlan ? <LinearResults plan={linearPlan} kerf={kerf} /> : <EmptyResultsState />)
    : (plan ? <ResultsPanel plan={plan} kerf={kerf} highlight={highlight} onHighlight={onHighlight} /> : <EmptyResultsState />)
  const printSheet = is1d
    ? linearPlan && <LinearPrintSheet plan={linearPlan} kerf={kerf} trimStart={linearTrim} />
    : plan && <PrintSheet plan={plan} kerf={kerf} trimLeft={trimLeft} trimTop={trimTop} />

  if (isDesktop) {
    return (
      <>
      <div className="h-screen overflow-hidden flex flex-col print:hidden">
        <Header onCompute={handleCompute} canCompute={canCompute} computing={computing} onCancel={cancel} onProjectChange={handleProjectChange} />
        <div className="grid grid-cols-[500px_1fr_420px] h-[calc(100vh-52px)] overflow-hidden">
          <aside className="overflow-y-auto border-r border-slate-200 bg-white">
            {inputPanel}
          </aside>
          <main className="overflow-y-auto bg-slate-50">
            {diagramContent}
          </main>
          <aside className="overflow-y-auto border-l border-slate-200 bg-white">
            {resultsContent}
          </aside>
        </div>
      </div>
      {printSheet}
      </>
    )
  }

  return (
    <>
    <div className="h-screen overflow-hidden flex flex-col print:hidden">
      <Header onCompute={handleCompute} canCompute={canCompute} computing={computing} onCancel={cancel} onProjectChange={handleProjectChange} />
      <div className="h-[calc(100vh-52px-48px)] overflow-hidden">
        {activeTab === 'eingabe' && (
          <div className="h-full overflow-y-auto bg-white">
            {inputPanel}
          </div>
        )}
        {activeTab === 'diagramm' && (
          <div className="h-full overflow-y-auto bg-slate-50">
            {diagramContent}
          </div>
        )}
        {activeTab === 'ergebnis' && (
          <div className="h-full overflow-y-auto bg-white">
            {resultsContent}
          </div>
        )}
      </div>
      <MobileTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
    {printSheet}
    </>
  )
}
