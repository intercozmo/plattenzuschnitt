// src/components/OptionsPanel.tsx
import { useStore } from '../store'

export default function OptionsPanel() {
  const kerf = useStore(s => s.kerf)
  const grainEnabled = useStore(s => s.grainEnabled)
  const priority = useStore(s => s.priority)
  const setKerf = useStore(s => s.setKerf)
  const setGrainEnabled = useStore(s => s.setGrainEnabled)
  const setPriority = useStore(s => s.setPriority)

  return (
    <div className="flex flex-col gap-4">
      {/* Kerf */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="options-kerf">
          Schnittfuge (mm)
        </label>
        <input
          id="options-kerf"
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={kerf}
          onChange={e => setKerf(Number(e.target.value))}
          className="w-24 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Grain */}
      <div className="flex items-center gap-2">
        <input
          id="options-grain"
          type="checkbox"
          checked={grainEnabled}
          onChange={e => setGrainEnabled(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <label className="text-sm font-medium text-slate-700 cursor-pointer" htmlFor="options-grain">
          Maserungsrichtung beachten
        </label>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="options-priority">
          Optimierung
        </label>
        <select
          id="options-priority"
          value={priority}
          onChange={e => setPriority(e.target.value as typeof priority)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="least-waste">Wenig Verschnitt</option>
          <option value="least-cuts">Wenig Schnitte</option>
          <option value="balanced">Ausgewogen</option>
        </select>
      </div>
    </div>
  )
}
