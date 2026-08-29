'use client'

import { Crosshair, Minus, MoreHorizontal, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { useOrbitalData } from './orbital-context'

const GlobeViz = dynamic(() => import('./globe-viz'), { ssr: false })

export function GlobePanel() {
  const { conjunctions } = useOrbitalData()
  const highRiskCount = conjunctions.filter((c) => c.risk_score > 7).length

  return (
    <section
      className="relative min-h-0 w-full flex-1 overflow-hidden bg-background"
      aria-label="Orbital conjunction visualization"
    >
      <GlobeViz />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-background"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-border bg-panel/75 px-4 py-3 backdrop-blur-sm">
        <Crosshair
          className={cn('size-5', highRiskCount > 0 ? 'text-destructive' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <div className="leading-tight">
          <p
            className={cn(
              'text-sm font-medium tracking-[0.08em]',
              highRiskCount > 0 ? 'text-destructive' : 'text-success',
            )}
          >
            {highRiskCount > 0 ? 'FOCUS ON EVENT' : 'SYSTEM NOMINAL'}
          </p>
          <p className="text-xs tracking-wider text-muted-foreground">
            {highRiskCount} HIGH-RISK CONJUNCTIONS
          </p>
        </div>
      </div>

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
    </section>
  )
}
