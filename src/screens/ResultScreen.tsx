import type { CutPlan } from '../types'
export default function ResultScreen({ plan: _plan, onBack }: { plan: CutPlan; onBack: () => void }) {
  return <div className="p-4"><button onClick={onBack} className="text-blue-600">← Zurück</button><h1 className="text-xl font-bold mt-2">Ergebnis</h1></div>
}
