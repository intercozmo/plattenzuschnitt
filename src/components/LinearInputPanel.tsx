// src/components/LinearInputPanel.tsx
import CollapsibleSection from './CollapsibleSection'
import LinearStockTable from './LinearStockTable'
import LinearPartsTable from './LinearPartsTable'
import { useStore } from '../store'

const inputClass = 'w-24 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

export default function LinearInputPanel() {
  const kerf = useStore(s => s.kerf)
  const setKerf = useStore(s => s.setKerf)
  const linearTrim = useStore(s => s.linearTrim)
  const setLinearTrim = useStore(s => s.setLinearTrim)

  return (
    <div className="flex flex-col gap-3">
      <CollapsibleSection title="Stangenbestand" defaultOpen={true}>
        <LinearStockTable />
      </CollapsibleSection>

      <CollapsibleSection title="Teileliste" defaultOpen={true}>
        <LinearPartsTable />
      </CollapsibleSection>

      <CollapsibleSection title="Optionen" defaultOpen={false}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="linear-kerf">
              Schnittfuge (mm)
            </label>
            <input
              id="linear-kerf"
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={kerf}
              onChange={e => setKerf(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="linear-trim">
              Anschnitt Stangenanfang (mm)
            </label>
            <input
              id="linear-trim"
              type="number"
              min={0}
              max={100}
              step={1}
              value={linearTrim}
              onChange={e => setLinearTrim(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
