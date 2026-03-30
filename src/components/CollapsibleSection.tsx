// src/components/CollapsibleSection.tsx
import { useState } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left font-medium text-slate-700 transition-colors"
      >
        <span>{title}</span>
        <span
          className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-90' : 'rotate-0'}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>
      <div className={`transition-all duration-200 ${open ? 'block' : 'hidden'}`}>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
