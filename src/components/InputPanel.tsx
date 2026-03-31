// src/components/InputPanel.tsx
import CollapsibleSection from './CollapsibleSection'
import StockTable from './StockTable'
import PiecesTable from './PiecesTable'
import OptionsPanel from './OptionsPanel'

export default function InputPanel() {
  return (
    <div className="flex flex-col gap-3">
      <CollapsibleSection title="Plattenbestand" defaultOpen={true}>
        <StockTable />
      </CollapsibleSection>

      <CollapsibleSection title="Stückliste" defaultOpen={true}>
        <PiecesTable />
      </CollapsibleSection>

      <CollapsibleSection title="Optionen" defaultOpen={false}>
        <OptionsPanel />
      </CollapsibleSection>
    </div>
  )
}
