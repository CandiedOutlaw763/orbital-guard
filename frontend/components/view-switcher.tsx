'use client'

import { cn } from '@/lib/utils'
import { useOrbitalData } from './orbital-context'

const views = [
  { id: 'globe' as const, label: 'Globe View' },
  { id: 'risk' as const, label: 'Risk Analysis' },
]

export function ViewSwitcher() {
  const { activeView, setActiveView } = useOrbitalData()

  return (
    <div
      className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2"
      role="tablist"
      aria-label="Visualization mode"
      data-sidebar-chrome
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-panel/90 p-1 shadow-lg backdrop-blur-sm">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeView === item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-colors',
              activeView === item.id
                ? 'bg-secondary text-foreground ring-1 ring-primary/50'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
