import type { CutPlan } from '../types'
export default function PiecesScreen({ onBack, onPlanReady }: { onBack: () => void; onPlanReady: (p: CutPlan) => void }) {
  void onPlanReady
  return <div className="p-4"><button onClick={onBack} className="text-blue-600">← Zurück</button><h1 className="text-xl font-bold mt-2">Stückliste</h1></div>
}
