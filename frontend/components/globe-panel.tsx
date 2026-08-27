'use client'

import { Crosshair, Minus, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const views = ['Globe View', 'Risk Analysis'] as const
type View = (typeof views)[number]

import dynamic from 'next/dynamic'
import { useOrbitalData } from './orbital-context'

const GlobeViz = dynamic(() => import('./globe-viz'), { ssr: false })

export function GlobePanel() {
  const [view, setView] = useState<View>('Globe View')
  const { conjunctions } = useOrbitalData()
  const highRiskCount = conjunctions.filter(c => c.risk_score > 7).length

  return (
    <section
      className="relative aspect-3/2 w-full overflow-hidden bg-background lg:aspect-auto lg:min-h-0 lg:w-auto lg:flex-1"
      aria-label="Orbital conjunction visualization"
    >
      {/* <GlobeViz /> */}

      {/* Mask the render's own top overlays so only the live UI shows */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-background"
        aria-hidden="true"
      />

      {/* Fade the bottom edge of the render into the page background */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />

      {/* View switcher */}
      <div
        className="absolute top-4 left-1/2 z-10 -translate-x-1/2"
        role="tablist"
        aria-label="Visualization mode"
      >
        <div className="flex items-center gap-1 rounded-full border border-border bg-panel/80 p-1 backdrop-blur-sm">
          {views.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              onClick={() => setView(item)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-colors',
                view === item
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Focus card */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-border bg-panel/75 px-4 py-3 backdrop-blur-sm">
        <Crosshair className={cn("size-5", highRiskCount > 0 ? "text-destructive" : "text-muted-foreground")} aria-hidden="true" />
        <div className="leading-tight">
          <p className={cn("text-sm font-medium tracking-[0.08em]", highRiskCount > 0 ? "text-destructive" : "text-success")}>
            {highRiskCount > 0 ? "FOCUS ON EVENT" : "SYSTEM NOMINAL"}
          </p>
          <p className="text-xs tracking-wider text-muted-foreground">
            {highRiskCount} HIGH-RISK CONJUNCTIONS
          </p>
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-1">
        {[
          { icon: Plus, label: 'Zoom in' },
          { icon: Minus, label: 'Zoom out' },
          { icon: MoreHorizontal, label: 'More map options' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-panel/80 hover:text-foreground"
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        ))}
      </div>

      {view === 'Risk Analysis' && (
        <div className="absolute inset-x-4 bottom-24 z-10 rounded-lg border border-border bg-panel/85 p-4 backdrop-blur-sm sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">RISK ANALYSIS</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Aggregate collision probability across all screened pairs remains below the{' '}
            <span className="font-mono text-foreground">
              1.0 &times; 10<sup>-4</sup>
            </span>{' '}
            maneuver threshold for the next 24 hours.
          </p>
        </div>
      )}
    </section>
  )
}
