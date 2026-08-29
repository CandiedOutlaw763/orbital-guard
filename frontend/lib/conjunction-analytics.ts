import * as satellite from 'satellite.js'
import type { Conjunction, TrackedObject } from '@/components/orbital-context'

export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW'

export function riskLevel(score: number): RiskLevel {
  if (score > 7) return 'HIGH'
  if (score > 4) return 'MODERATE'
  return 'LOW'
}

export function riskQualifier(score: number) {
  if (score > 8.5) return 'Very High'
  if (score > 7) return 'High'
  if (score > 4) return 'Moderate'
  return 'Low'
}

export function riskScore100(score: number) {
  return Math.round(Math.min(10, Math.max(0, score)) * 10)
}

export function formatCountdown(tca: Date, now: Date) {
  const diff = tca.getTime() - now.getTime()
  if (diff <= 0) return 'Passed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export function collisionProbability(missKm: number, relVelKmS: number) {
  const pc = 0.0015 * Math.exp(-Math.max(0, missKm)) * (Math.max(0.1, relVelKmS) / 7.55)
  return Math.min(0.05, Math.max(1e-8, pc))
}

export function toScientific(value: number) {
  if (value <= 0) return { mantissa: '0.0', exponent: '0' }
  const exponent = Math.floor(Math.log10(value))
  const mantissa = value / 10 ** exponent
  return { mantissa: mantissa.toFixed(1), exponent: String(exponent) }
}

export function missDistanceLabel(missKm: number) {
  if (missKm < 1) {
    const meters = missKm * 1000
    return {
      primary: `${Math.round(meters).toLocaleString()} m`,
      secondary: `(${missKm.toFixed(6)} km)`,
    }
  }
  return {
    primary: `${missKm.toFixed(2)} km`,
    secondary: `(${(missKm * 1000).toFixed(0)} m)`,
  }
}

export function distanceAtOffsetSeconds(missKm: number, relVelKmS: number, offsetSeconds: number) {
  return Math.sqrt(missKm ** 2 + (relVelKmS * offsetSeconds) ** 2)
}

export function inferType(name: string, fallback?: string) {
  const n = name.toUpperCase()
  if (fallback && fallback !== 'UNKNOWN') return fallback
  if (n.includes('DEB') || n.includes('DEBRIS')) return 'Debris'
  if (n.includes('R/B') || n.includes('ROCKET')) return 'Rocket Body'
  if (n.includes('STARLINK') || n.includes('IRIDIUM') || n.includes('ONEWEB')) {
    return 'Communication Satellite'
  }
  if (n.includes('ISS') || n.includes('ZARYA')) return 'Space Station'
  return 'Earth Observation'
}

export function inferOperator(name: string) {
  const n = name.toUpperCase()
  if (n.includes('STARLINK')) return 'SpaceX'
  if (n.includes('IRIDIUM')) return 'Iridium'
  if (n.includes('ONEWEB')) return 'OneWeb'
  if (n.includes('ISS') || n.includes('ZARYA')) return 'International'
  if (n.includes('COSMOS')) return 'Roscosmos'
  if (n.includes('FENGYUN') || n.includes('CZ-')) return 'CNSA'
  return 'Unknown'
}

export function parseInclination(tle2?: string) {
  if (!tle2 || tle2.length < 16) return null
  const value = Number.parseFloat(tle2.slice(8, 16))
  return Number.isFinite(value) ? value : null
}

export function parseTleEpoch(tle1?: string) {
  if (!tle1 || tle1.length < 32) return null
  const yearTwo = Number.parseInt(tle1.slice(18, 20), 10)
  const dayOfYear = Number.parseFloat(tle1.slice(20, 32))
  if (!Number.isFinite(yearTwo) || !Number.isFinite(dayOfYear)) return null
  const year = yearTwo < 57 ? 2000 + yearTwo : 1900 + yearTwo
  const date = new Date(Date.UTC(year, 0, 1))
  date.setUTCDate(date.getUTCDate() + Math.floor(dayOfYear) - 1)
  return date
}

export type ObjectSnapshot = {
  norad_id: number
  name: string
  type: string
  operator: string
  launchDate: string
  mass: string
  altitude: string
  inclination: string
  velocity: string
}

export function snapshotForObject(
  object: { norad_id: number; name: string } | null | undefined,
  tracked: TrackedObject[],
  at: Date,
): ObjectSnapshot {
  const name = object?.name ?? 'Unknown'
  const norad_id = object?.norad_id ?? 0
  const match = tracked.find((item) => item.norad_id === norad_id)
  const inclination = parseInclination(match?.tle2)
  const epoch = parseTleEpoch(match?.tle1)

  let altitude = '—'
  let velocity = '—'
  if (match?.tle1 && match?.tle2) {
    try {
      const satrec = satellite.twoline2satrec(match.tle1, match.tle2)
      const pv = satellite.propagate(satrec, at)
      if (pv.position && typeof pv.position !== 'boolean') {
        const gmst = satellite.gstime(at)
        const gd = satellite.eciToGeodetic(pv.position, gmst)
        altitude = `${gd.height.toFixed(0)} km`
      }
      if (pv.velocity && typeof pv.velocity !== 'boolean') {
        const mag = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
        velocity = `${mag.toFixed(2)} km/s`
      }
    } catch {
      // keep placeholders
    }
  }

  const sizeMass: Record<string, string> = {
    LARGE: '3,200 kg',
    MEDIUM: '850 kg',
    SMALL: '260 kg',
  }

  return {
    norad_id,
    name,
    type: inferType(name, match?.type),
    operator: inferOperator(name),
    launchDate: epoch
      ? epoch.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—',
    mass: sizeMass[match?.size ?? ''] ?? '—',
    altitude,
    inclination: inclination != null ? `${inclination.toFixed(1)}°` : '—',
    velocity,
  }
}

export function selectedConjunction(conjunctions: Conjunction[], selectedId: number | null) {
  if (selectedId != null) {
    const match = conjunctions.find((item) => item.id === selectedId)
    if (match) return match
  }
  return conjunctions[0] ?? null
}
