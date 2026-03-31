// src/components/CollapsibleSection.tsx
import { useState, useId, type ReactNode } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function CollapsibleSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors"
      >
        <span>{title}</span>
        <span
          className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-90' : 'rotate-0'}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>
      <div
        id={contentId}
        className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
