// src/App.tsx
import { useState } from 'react'
import StockScreen from './screens/StockScreen'
import PiecesScreen from './screens/PiecesScreen'
import ResultScreen from './screens/ResultScreen'
import type { CutPlan } from './types'

type Screen = 'stock' | 'pieces' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('stock')
  const [plan, setPlan] = useState<CutPlan | null>(null)

  function handlePlanReady(p: CutPlan) {
    setPlan(p)
    setScreen('result')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 max-w-lg mx-auto">
      {screen === 'stock' && (
        <StockScreen onNext={() => setScreen('pieces')} />
      )}
      {screen === 'pieces' && (
        <PiecesScreen
          onBack={() => setScreen('stock')}
          onPlanReady={handlePlanReady}
        />
      )}
      {screen === 'result' && plan && (
        <ResultScreen
          plan={plan}
          onBack={() => setScreen('pieces')}
        />
      )}
    </div>
  )
}
