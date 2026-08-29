'use client'

import {
  AlertTriangle,
  Clock3,
  Crosshair,
  Gauge,
  Shield,
} from 'lucide-react'
import { useMemo } from 'react'
import { useOrbitalData } from './orbital-context'
import { cn } from '@/lib/utils'
import {
  collisionProbability,
  distanceAtOffsetSeconds,
  formatCountdown,
  missDistanceLabel,
  riskLevel,
  riskQualifier,
  riskScore100,
  selectedConjunction,
  snapshotForObject,
  toScientific,
  type ObjectSnapshot,
} from '@/lib/conjunction-analytics'

function SatelliteWatermark() {
  return (
    <svg
      viewBox="0 0 120 88"
      className="pointer-events-none absolute right-3 bottom-2 h-16 w-24 text-primary/25"
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <rect x="48" y="34" width="24" height="20" rx="3" />
        <path d="M48 44 H18 M72 44 H102" />
        <rect x="8" y="34" width="12" height="20" rx="1.5" />
        <rect x="100" y="34" width="12" height="20" rx="1.5" />
        <path d="M60 34 V22 M56 22 H64" />
        <circle cx="60" cy="18" r="3" />
      </g>
    </svg>
  )
}

function ObjectCard({
  title,
  snapshot,
}: {
  title: string
  snapshot: ObjectSnapshot
}) {
  const rows = [
    ['NORAD ID', String(snapshot.norad_id || '—')],
    ['Name', snapshot.name],
    ['Type', snapshot.type],
    ['Operator', snapshot.operator],
    ['Launch Date', snapshot.launchDate],
    ['Mass', snapshot.mass],
    ['Altitude', snapshot.altitude],
    ['Inclination', snapshot.inclination],
    ['Velocity', snapshot.velocity],
  ]

  return (
    <article className="relative overflow-hidden rounded-lg border border-border bg-panel p-5">
      <h3 className="text-sm font-semibold tracking-[0.12em] text-foreground">
        {title}: <span className="text-primary">{snapshot.name}</span>
      </h3>
      <dl className="relative z-10 mt-4 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[9.5rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono text-foreground sm:text-primary/90">{value}</dd>
          </div>
        ))}
      </dl>
      <SatelliteWatermark />
    </article>
  )
}

function DistanceChart({
  missKm,
}: {
  missKm: number
  relVelKmS: number
}) {
  const width = 720
  const height = 280
  const pad = { l: 56, r: 28, t: 20, b: 40 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const hours = [-24, -18, -12, -6, 0, 6, 12]
  const tMin = -24
  const tMax = 12

  const samples = useMemo(() => {
    const kmPerHour = Math.max(0.35, missKm * 0.18)
    const points: { h: number; d: number }[] = []
    for (let h = tMin; h <= tMax; h += 0.25) {
      points.push({
        h,
        d: Math.sqrt(missKm ** 2 + (kmPerHour * h) ** 2),
      })
    }
    return points
  }, [missKm, tMin, tMax])

  const yMax = Math.max(10, ...samples.map((p) => p.d))
  const yMin = Math.max(0.001, Math.min(missKm, 1) / 8)
  const logMin = Math.log10(yMin)
  const logMax = Math.log10(yMax)

  const xOf = (h: number) => pad.l + ((h - tMin) / (tMax - tMin)) * plotW
  const yOf = (d: number) => {
    const t = (Math.log10(Math.max(d, yMin)) - logMin) / (logMax - logMin)
    return pad.t + plotH - t * plotH
  }

  const path = samples
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.h).toFixed(2)} ${yOf(p.d).toFixed(2)}`)
    .join(' ')

  const yTicks = []
  const startExp = Math.floor(logMin)
  const endExp = Math.ceil(logMax)
  for (let exp = startExp; exp <= endExp; exp++) {
    yTicks.push(10 ** exp)
  }

  const missLabel = missDistanceLabel(missKm)

  return (
    <article className="rounded-lg border border-border bg-panel p-5">
      <h3 className="text-[11px] tracking-[0.18em] text-muted-foreground">DISTANCE (KM)</h3>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full min-w-[28rem] text-muted-foreground"
          role="img"
          aria-label="Separation distance versus time around TCA"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.l}
                x2={width - pad.r}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke="currentColor"
                strokeOpacity="0.18"
              />
              <text
                x={pad.l - 8}
                y={yOf(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {tick >= 1 ? tick : tick.toExponential(0)}
              </text>
            </g>
          ))}
          {hours.map((h) => (
            <text
              key={h}
              x={xOf(h)}
              y={height - 12}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="11"
            >
              {h === 0 ? 'TCA' : `${h > 0 ? '+' : ''}${h}h`}
            </text>
          ))}
          <line
            x1={xOf(0)}
            x2={xOf(0)}
            y1={pad.t}
            y2={pad.t + plotH}
            stroke="oklch(0.6 0.22 25)"
            strokeDasharray="4 4"
          />
          <path d={path} fill="none" stroke="oklch(0.72 0.19 148)" strokeWidth="2.4" />
          <circle cx={xOf(0)} cy={yOf(missKm)} r="5" fill="oklch(0.6 0.22 25)" />
          <text
            x={xOf(0) + 10}
            y={yOf(missKm) - 10}
            className="fill-destructive"
            fontSize="11"
          >
            Miss Distance {missLabel.primary}
          </text>
        </svg>
      </div>
    </article>
  )
}

function ConjunctionTimeline({
  tca,
  missKm,
  relVelKmS,
}: {
  tca: Date
  missKm: number
  relVelKmS: number
}) {
  const nodes = [
    { offsetH: -12, label: '-12h', note: 'Objects approaching' },
    { offsetH: -1, label: '-1h', note: 'Separation decreasing' },
    { offsetH: 0, label: 'TCA', note: 'Closest approach' },
    { offsetH: 1, label: '+1h', note: 'Objects receding' },
    { offsetH: 12, label: '+12h', note: 'Safe separation' },
  ]

  return (
    <article className="rounded-lg border border-border bg-panel p-5">
      <h3 className="text-[11px] tracking-[0.18em] text-muted-foreground">CONJUNCTION TIMELINE</h3>
      <ol className="relative mt-6 ml-3 border-l border-border">
        {nodes.map((node) => {
          const at = new Date(tca.getTime() + node.offsetH * 3600000)
          const distance = distanceAtOffsetSeconds(missKm, relVelKmS, node.offsetH * 3600)
          const isTca = node.offsetH === 0
          return (
            <li key={node.label} className="relative pb-6 pl-6 last:pb-0">
              <span
                className={cn(
                  'absolute top-1.5 -left-[5px] size-2.5 rounded-full border',
                  isTca ? 'border-destructive bg-destructive' : 'border-primary bg-background',
                )}
              />
              <div
                className={cn(
                  'rounded-md px-3 py-2',
                  isTca && 'bg-destructive/15 ring-1 ring-destructive/40',
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn('text-sm font-semibold', isTca ? 'text-destructive' : 'text-foreground')}>
                    {node.label}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {at.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{node.note}</p>
                <p className="mt-1 font-mono text-xs text-foreground">
                  {distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

export function RiskAnalysisPanel() {
  const { conjunctions, trackedObjects, currentTime, selectedConjunctionId } = useOrbitalData()
  const alert = selectedConjunction(conjunctions, selectedConjunctionId)

  const object1 = snapshotForObject(alert?.object1, trackedObjects, currentTime)
  const object2 = snapshotForObject(alert?.object2, trackedObjects, currentTime)

  if (!alert) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background px-5 pt-16 pb-6"
        aria-label="Conjunction analytics"
      >
        <h2 className="text-2xl font-semibold tracking-[0.12em]">CONJUNCTION ANALYTICS</h2>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">
          No screened conjunctions are available yet. Track additional objects or wait for the
          next screening cycle.
        </p>
      </section>
    )
  }

  const tca = new Date(alert.tca_time)
  const level = riskLevel(alert.risk_score)
  const pc = collisionProbability(alert.miss_distance_km, alert.relative_velocity_km_s)
  const sci = toScientific(pc)
  const miss = missDistanceLabel(alert.miss_distance_km)
  const score = riskScore100(alert.risk_score)
  const countdown = formatCountdown(tca, currentTime)

  const metrics: {
    label: string
    icon: typeof Clock3
    iconClass: string
    valueClass: string
    value: string
    detail: string
    detailClass?: string
    sub: string | null
  }[] = [
    {
      label: 'TCA',
      icon: Clock3,
      iconClass: 'text-primary',
      valueClass: 'text-destructive',
      value: tca.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC',
      detail: countdown === 'Passed' ? 'Event passed' : `in ${countdown}`,
      sub: tca.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    },
    {
      label: 'Miss Distance',
      icon: Crosshair,
      iconClass: 'text-primary',
      valueClass: 'text-success',
      value: miss.primary,
      detail: miss.secondary,
      sub: null,
    },
    {
      label: 'Collision Probability',
      icon: AlertTriangle,
      iconClass: 'text-destructive',
      valueClass: 'text-destructive',
      value: `${sci.mantissa} × 10^${sci.exponent}`,
      detail: `${(pc * 100).toPrecision(2)}%`,
      sub: null,
    },
    {
      label: 'Relative Velocity',
      icon: Gauge,
      iconClass: 'text-success',
      valueClass: 'text-warning',
      value: `${alert.relative_velocity_km_s.toFixed(2)} km/s`,
      detail: `${Math.round(alert.relative_velocity_km_s * 3600).toLocaleString()} km/h`,
      sub: null,
    },
    {
      label: 'Risk Score',
      icon: Shield,
      iconClass: 'text-success',
      valueClass: 'text-destructive',
      value: `${score} / 100`,
      detail: riskQualifier(alert.risk_score),
      detailClass: 'text-destructive',
      sub: null,
    },
  ]

  return (
    <section
      className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto bg-background px-5 pt-16 pb-6"
      aria-label="Conjunction analytics"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-[0.14em]">CONJUNCTION ANALYTICS</h2>
        <span
          className={cn(
            'rounded px-2 py-0.5 text-[11px] font-semibold tracking-[0.16em]',
            level === 'HIGH' && 'bg-destructive/20 text-destructive',
            level === 'MODERATE' && 'bg-warning/20 text-warning',
            level === 'LOW' && 'bg-success/20 text-success',
          )}
        >
          {level === 'HIGH' ? 'HIGH RISK' : `${level} RISK`}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-y border-border py-5 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.16em] text-muted-foreground">
              <metric.icon className={cn('size-3.5', metric.iconClass)} aria-hidden="true" />
              {metric.label}
            </div>
            {metric.sub && (
              <p className="mt-2 text-xs text-muted-foreground">{metric.sub}</p>
            )}
            <p className={cn('mt-1 font-mono text-xl font-semibold tracking-tight', metric.valueClass)}>
              {metric.label === 'Collision Probability' ? (
                <>
                  {sci.mantissa} &times; 10<sup>{sci.exponent}</sup>
                </>
              ) : (
                metric.value
              )}
            </p>
            <p className={cn('mt-1 text-xs text-muted-foreground', metric.detailClass)}>
              {metric.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ObjectCard title="OBJECT 1" snapshot={object1} />
        <ObjectCard title="OBJECT 2" snapshot={object2} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <DistanceChart
          missKm={alert.miss_distance_km}
          relVelKmS={alert.relative_velocity_km_s}
        />
        <ConjunctionTimeline
          tca={tca}
          missKm={alert.miss_distance_km}
          relVelKmS={alert.relative_velocity_km_s}
        />
      </div>
    </section>
  )
}
