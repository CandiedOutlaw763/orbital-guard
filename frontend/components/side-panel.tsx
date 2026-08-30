'use client'

import { Activity, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useOrbitalData } from './orbital-context'
import { cn } from '@/lib/utils'
import {
  collisionProbability,
  formatCountdown,
  missDistanceLabel,
  riskLevel,
  toScientific,
} from '@/lib/conjunction-analytics'

const riskTone = {
  HIGH: {
    badge: 'bg-destructive/20 text-destructive',
    bar: 'bg-destructive',
    countdown: 'text-destructive',
  },
  MODERATE: {
    badge: 'bg-warning/20 text-warning',
    bar: 'bg-warning',
    countdown: 'text-warning',
  },
  LOW: {
    badge: 'bg-success/20 text-success',
    bar: 'bg-success',
    countdown: 'text-success',
  },
} as const

function AlertList() {
  const {
    conjunctions,
    currentTime,
    selectedConjunctionId,
    setSelectedConjunctionId,
    setActiveView,
    setFocusedObjectId,
  } = useOrbitalData()

  if (conjunctions.length === 0) {
    return <p className="text-sm text-muted-foreground">No conjunctions found.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {conjunctions.slice(0, 10).map((alert) => {
        const risk = riskLevel(alert.risk_score)
        const tone = riskTone[risk]
        const tca = new Date(alert.tca_time)
        const selected = selectedConjunctionId === alert.id
        const countdown = formatCountdown(tca, currentTime)
        const miss = missDistanceLabel(alert.miss_distance_km)
        const pc = collisionProbability(alert.miss_distance_km, alert.relative_velocity_km_s)
        const sci = toScientific(pc)

        return (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedConjunctionId(alert.id)
                setFocusedObjectId(null) // Clear focused object so conjunction takes precedence
              }}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border bg-panel p-4 text-left transition-colors',
                selected
                  ? 'border-primary/60 bg-secondary/40 ring-1 ring-primary/40'
                  : 'border-border hover:border-input hover:bg-secondary/30',
              )}
            >
              {!selected && (
                <span className={cn('absolute inset-y-0 left-0 w-0.5', tone.bar)} aria-hidden="true" />
              )}

              <div className="flex items-start justify-between gap-3 pl-1">
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.16em]',
                    tone.badge,
                  )}
                >
                  {risk}
                </span>
                <p
                  className={cn(
                    'shrink-0 text-right font-mono text-xs tabular-nums',
                    countdown === 'Passed' ? 'text-muted-foreground' : tone.countdown,
                  )}
                >
                  {countdown}
                </p>
              </div>

              <h3 className="mt-3 space-y-0.5 pl-1 font-mono text-sm leading-snug">
                <span className="block truncate text-foreground">{alert.object1?.name}</span>
                <span className="block truncate text-muted-foreground">
                  &times; {alert.object2?.name}
                </span>
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 pl-1">
                <div className="min-w-0 leading-snug">
                  <p className="text-[11px] tracking-[0.16em] text-muted-foreground">TCA</p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    {tca.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {tca.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </p>
                </div>
                <div className="min-w-0 text-right leading-snug">
                  <p className="text-[11px] tracking-[0.16em] text-muted-foreground">MISS / Pc</p>
                  <p className="mt-1 font-mono text-xs text-foreground">{miss.primary}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {sci.mantissa} &times; 10<sup>{sci.exponent}</sup>
                  </p>
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MapLegend() {
  const items = [
    { label: 'Past Path', className: 'h-0.5 w-5 rounded-full bg-destructive/80' },
    { label: 'Future Path', className: 'h-0.5 w-5 rounded-full bg-warning' },
    { label: 'TCA Alert', className: 'size-2 rounded-full bg-destructive' },
  ]

  return (
    <div>
      <h2 className="text-[11px] tracking-[0.18em] text-muted-foreground">MAP LEGEND</h2>
      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={item.className} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SidePanel() {
  const [statsOpen, setStatsOpen] = useState(true)
  const {
    trackedObjects,
    conjunctions,
    refreshData,
    setFocusedObjectId,
    setSelectedConjunctionId,
    setSidebarOpen,
    activeView,
  } = useOrbitalData()
  const isRiskAnalysisView = activeView === 'risk'

  const handleAddRandom = () => {
    fetch('/api/objects/random', { method: 'POST' })
      .then(r => r.json())
      .then(() => refreshData());
  };

  const handleClear = () => {
    fetch('/api/objects/clear', { method: 'POST' })
      .then(r => r.json())
      .then(() => refreshData());
  };

  const maxRisk = conjunctions.length > 0 ? Math.max(...conjunctions.map(c => c.risk_score)) : 0;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-t border-border bg-background lg:border-t-0 lg:border-l">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold tracking-[0.14em]">CONJUNCTION ALERTS</h2>
        {isRiskAnalysisView ? (
          <span aria-hidden="true" className="inline-flex size-8 shrink-0 rounded-md" />
        ) : (
          <button
            type="button"
            aria-label="Close conjunction alerts"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex flex-col gap-6 overflow-y-auto px-5 py-5 lg:flex-1">
        <AlertList />
        <MapLegend />

        <div className="border-t border-border pt-5">
          <button
            type="button"
            onClick={() => setStatsOpen((open) => !open)}
            aria-expanded={statsOpen}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-semibold tracking-[0.12em]">TRACKED OBJECTS</span>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                statsOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          {statsOpen && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-mono text-3xl leading-none tabular-nums">{trackedObjects.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Total Tracked</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddRandom} className="text-xs border border-primary text-primary px-2 py-1 rounded hover:bg-primary/10">Add 20 Random</button>
                  <button onClick={handleClear} className="text-xs border border-destructive text-destructive px-2 py-1 rounded hover:bg-destructive/10">Clear All</button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-panel p-4">
                <div>
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground">MAX RISK</p>
                  <p className={cn("mt-1 font-mono text-2xl leading-none tabular-nums", maxRisk > 7 ? 'text-destructive' : maxRisk > 4 ? 'text-warning' : 'text-success')}>
                    {maxRisk.toFixed(1)}/10
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className={cn("size-5", maxRisk > 7 ? 'text-destructive' : maxRisk > 4 ? 'text-warning' : 'text-success')} aria-hidden="true" />
                  <span className={cn("size-2 rounded-full", maxRisk > 7 ? 'bg-destructive' : maxRisk > 4 ? 'bg-warning' : 'bg-success')} aria-hidden="true" />
                  <span className="sr-only">Risk level indicator</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[11px] tracking-[0.18em] text-muted-foreground">TRACKED OBJECTS</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {trackedObjects.map((object) => (
              <li key={object.norad_id}>
                <button
                  type="button"
                  onClick={() => {
                    setFocusedObjectId(object.norad_id);
                    setSelectedConjunctionId(null);
                  }}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    'border-border bg-panel hover:border-input',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold tracking-wide',
                        'text-foreground',
                      )}
                    >
                      {object.name}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs',
                        'text-muted-foreground',
                      )}
                    >
                      {object.norad_id}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        TCA: Time of Closest Approach
      </p>
    </aside>
  )
}
