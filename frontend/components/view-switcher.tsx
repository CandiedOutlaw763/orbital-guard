'use client'

import { cn } from '@/lib/utils'
import { useOrbitalData } from './orbital-context'

const views = [
  { id: 'globe' as const, label: 'Globe View' },
  { id: 'risk' as const, label: 'Risk Analysis' },
]

export function ViewSwitcher() {
  const { activeView, setActiveView, setSidebarOpen } = useOrbitalData()

  return (
    <div
      className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2"
      role="tablist"
      aria-label="Visualization mode"
      data-sidebar-chrome
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/65 p-1 shadow-[0_12px_28px_rgba(15,23,42,0.65),0_0_0_1px_rgba(148,163,184,0.12)] backdrop-blur-xl">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeView === item.id}
            onClick={() => {
              setActiveView(item.id)
              if (item.id === 'risk') setSidebarOpen(true)
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-all duration-200',
              activeView === item.id
                ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                : 'text-slate-300 hover:bg-white/5 hover:text-white',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
