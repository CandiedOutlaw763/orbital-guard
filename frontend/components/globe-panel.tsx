'use client'

import {
  AlertTriangle,
  Clock3,
  Crosshair,
  Minus,
  Plus,
  Satellite,
  Scan,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useOrbitalData } from './orbital-context'
import type { GlobeHandle } from './globe-viz'

const GlobeViz = dynamic(() => import('./globe-viz'), { ssr: false })

export function GlobePanel() {
  const { conjunctions, trackedObjects, currentTime, sidebarOpen } = useOrbitalData()
  const globeApi = useRef<GlobeHandle | null>(null)
  const expanded = !sidebarOpen
  const highRiskCount = conjunctions.filter((c) => c.risk_score > 7).length
  const coverage =
    trackedObjects.length === 0
      ? '—'
      : `${((trackedObjects.filter((o) => o.tle1 && o.tle2).length / trackedObjects.length) * 100).toFixed(2)}%`

  const nextTca = conjunctions
    .map((c) => new Date(c.tca_time))
    .filter((d) => d.getTime() > currentTime.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0]

  const nextTcaLabel = nextTca
    ? nextTca.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : '—'

  const stats = [
    { icon: Satellite, label: 'Objects Tracked', value: String(trackedObjects.length), tone: 'text-foreground' },
    { icon: AlertTriangle, label: 'High-Risk Events', value: String(highRiskCount), tone: 'text-destructive' },
    { icon: Crosshair, label: 'Close Approaches', value: String(conjunctions.length), tone: 'text-warning' },
    { icon: Scan, label: 'Tracking Coverage', value: coverage, tone: 'text-primary' },
    { icon: Clock3, label: 'Next TCA', value: nextTcaLabel, tone: 'text-success' },
  ]

  const rail = [
    { icon: Crosshair, label: 'Center', onClick: () => globeApi.current?.center() },
    { icon: Plus, label: 'Zoom In', onClick: () => globeApi.current?.zoomIn() },
    { icon: Minus, label: 'Zoom Out', onClick: () => globeApi.current?.zoomOut() },
  ]

  return (
    <section
      className="relative min-h-0 w-full flex-1 overflow-hidden bg-background"
      aria-label="Orbital conjunction visualization"
    >
      <GlobeViz onReady={(api) => { globeApi.current = api }} />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-background"
        aria-hidden="true"
      />

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          expanded ? 'opacity-0' : 'opacity-100',
        )}
        aria-hidden="true"
      />

      <div
        data-sidebar-chrome
        className={cn(
          'absolute z-10 flex items-center gap-3 rounded-lg border border-border bg-panel/80 px-4 py-3 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          expanded ? 'top-16 left-4' : 'bottom-4 left-4',
        )}
      >
        <Crosshair
          className={cn('size-5', highRiskCount > 0 ? 'text-destructive' : 'text-success')}
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

      <div
        data-sidebar-chrome
        className={cn(
          'absolute top-16 right-4 z-10 flex flex-col gap-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          expanded && 'rounded-lg border border-border bg-panel/85 p-1 backdrop-blur-sm',
        )}
      >
        {(expanded ? rail : rail.slice(1)).map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              'rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              expanded && 'flex flex-col items-center gap-1 px-2.5 py-2',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {expanded && (
              <span className="text-[9px] font-semibold tracking-[0.12em]">{label.toUpperCase()}</span>
            )}
          </button>
        ))}
      </div>

      <div
        data-sidebar-chrome
        className={cn(
          'absolute inset-x-0 bottom-5 z-10 flex justify-center px-4',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          expanded ? 'translate-y-0' : 'pointer-events-none translate-y-[calc(100%+1.5rem)]',
        )}
      >
        <ul className="flex max-w-full items-stretch overflow-x-auto rounded-[32px] border border-border bg-panel/90 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md scrollbar-thin">
          {stats.map(({ icon: Icon, label, value, tone }) => (
            <li
              key={label}
              className="flex min-w-40 shrink-0 items-center gap-3.5 px-6 py-4 first:pl-8 last:pr-8 not-last:border-r not-last:border-border"
            >
              <Icon className={cn('size-6 shrink-0', tone)} aria-hidden="true" />
              <div className="min-w-0 leading-tight">
                <p className="truncate font-mono text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
                  {label.toUpperCase()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
