'use client'

import { Activity, ChevronDown, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useOrbitalData } from './orbital-context'
import { cn } from '@/lib/utils'

const riskStyles: Record<string, string> = {
  HIGH: 'bg-destructive/15 text-destructive',
  MODERATE: 'bg-warning/15 text-warning',
  LOW: 'bg-success/15 text-success',
}

function AlertList() {
  const { conjunctions, currentTime } = useOrbitalData();

  if (conjunctions.length === 0) {
    return <p className="text-sm text-muted-foreground">No conjunctions found.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {conjunctions.slice(0, 10).map((alert) => {
        const risk = alert.risk_score > 7 ? 'HIGH' : alert.risk_score > 4 ? 'MODERATE' : 'LOW';
        const tcaDateObj = new Date(alert.tca_time);
        
        // Calculate countdown
        const diff = tcaDateObj.getTime() - currentTime.getTime();
        let countdown = "Passed";
        if (diff > 0) {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          countdown = `${h}h ${m}m ${s}s`;
        }

        const tcaDate = tcaDateObj.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        const tcaTimeStr = tcaDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });

        return (
          <li key={alert.id}>
            <article className="rounded-lg border border-border bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider',
                      riskStyles[risk],
                    )}
                  >
                    {risk}
                  </span>
                  <h3 className="font-mono text-sm leading-snug text-foreground truncate">
                    {alert.object1?.name} &times; {alert.object2?.name}
                  </h3>
                </div>
                <p className="shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {countdown}
                </p>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="leading-snug">
                  <p className="text-[11px] tracking-wider text-muted-foreground">TCA</p>
                  <p className="font-mono text-xs text-foreground">{tcaDate}</p>
                  <p className="font-mono text-xs text-foreground">{tcaTimeStr}</p>
                </div>
                <div className="text-right leading-snug">
                  <p className="text-[11px] tracking-wider text-muted-foreground">Miss Distance</p>
                  <p className="font-mono text-xs text-foreground">
                    {alert.miss_distance_km.toFixed(2)} km
                  </p>
                </div>
              </div>
            </article>
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
  const { trackedObjects, conjunctions, refreshData, setFocusedObjectId } = useOrbitalData();

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
    <aside className="flex w-full shrink-0 flex-col border-t border-border bg-background lg:w-[22rem] lg:border-t-0 lg:border-l xl:w-[24rem]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-[0.14em]">CONJUNCTION ALERTS</h2>
        <button
          type="button"
          onClick={refreshData}
          className="text-xs text-primary transition-colors hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw size={12} /> Refresh
        </button>
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
                  onClick={() => setFocusedObjectId(object.norad_id)}
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
