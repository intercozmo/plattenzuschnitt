// src/components/MobileTabBar.tsx
type Tab = 'eingabe' | 'diagramm' | 'ergebnis'

interface Props {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'eingabe', label: 'Eingabe', icon: '✏️' },
  { id: 'diagramm', label: 'Diagramm', icon: '📐' },
  { id: 'ergebnis', label: 'Ergebnis', icon: '📊' },
]

export default function MobileTabBar({ activeTab, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t border-slate-200 flex">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center text-xs ${
            activeTab === tab.id
              ? 'text-blue-600 font-medium'
              : 'text-slate-500'
          }`}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
