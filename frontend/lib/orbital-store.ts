import fs from 'node:fs'
import path from 'node:path'
import * as satellite from 'satellite.js'

export type CatalogEntry = {
  norad_id: number
  name: string
  tle1: string
  tle2: string
}

export type TrackedObjectRecord = CatalogEntry & {
  type: string
  size: string
}

export type ConjunctionRecord = {
  id: number
  object1: { norad_id: number; name: string }
  object2: { norad_id: number; name: string }
  tca_time: string
  miss_distance_km: number
  relative_velocity_km_s: number
  risk_score: number
}

const EARTH_RADIUS_KM = 6371
const MAX_TRACKED = 40

let catalog: CatalogEntry[] | null = null
let catalogById: Map<number, CatalogEntry> | null = null
const tracked = new Map<number, TrackedObjectRecord>()
let conjunctions: ConjunctionRecord[] = []
let nextConjunctionId = 1
let seeded = false

function parseTleCatalog(text: string): CatalogEntry[] {
  const lines = text.split(/\r?\n/)
  const entries: CatalogEntry[] = []
  for (let i = 0; i < lines.length - 2; i++) {
    const name = lines[i]?.trim()
    const line1 = lines[i + 1]?.trim()
    const line2 = lines[i + 2]?.trim()
    if (!name || !line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue
    const norad_id = Number.parseInt(line1.slice(2, 7), 10)
    if (!Number.isFinite(norad_id)) continue
    entries.push({ norad_id, name, tle1: line1, tle2: line2 })
    i += 2
  }
  return entries
}

export function getCatalog(): CatalogEntry[] {
  if (catalog) return catalog
  const filePath = path.join(process.cwd(), 'api', 'active.txt')
  const text = fs.readFileSync(filePath, 'utf8')
  catalog = parseTleCatalog(text)
  catalogById = new Map(catalog.map((entry) => [entry.norad_id, entry]))
  return catalog
}

export function getCatalogById(): Map<number, CatalogEntry> {
  getCatalog()
  return catalogById as Map<number, CatalogEntry>
}

function ensureSeeded() {
  if (seeded) return
  seeded = true
  const all = getCatalog()
  const preferred = [25544, 20580]
  const picked: CatalogEntry[] = []
  const seen = new Set<number>()
  for (const id of preferred) {
    const entry = getCatalogById().get(id)
    if (entry && !seen.has(entry.norad_id)) {
      seen.add(entry.norad_id)
      picked.push(entry)
    }
  }
  for (const entry of all) {
    if (picked.length >= 12) break
    if (seen.has(entry.norad_id)) continue
    seen.add(entry.norad_id)
    picked.push(entry)
  }
  for (const entry of picked) {
    tracked.set(entry.norad_id, { ...entry, type: 'UNKNOWN', size: 'UNKNOWN' })
  }
  recomputeConjunctions()
}

function eciAt(tle1: string, tle2: string, date: Date) {
  const satrec = satellite.twoline2satrec(tle1, tle2)
  const pv = satellite.propagate(satrec, date)
  const position = pv.position
  const velocity = pv.velocity
  if (!position || typeof position === 'boolean' || !velocity || typeof velocity === 'boolean') {
    return null
  }
  return { position, velocity }
}

function riskScore(missKm: number, relVelKmS: number) {
  if (missKm < 30) return 9.5
  if (missKm < 80 && relVelKmS > 10) return 8.5
  if (missKm < 80) return 5.0
  if (relVelKmS >= 5) return 5.0
  return 2.0
}

function recomputeConjunctions() {
  const objects = [...tracked.values()]
  const found: ConjunctionRecord[] = []
  const now = Date.now()
  const hours = 12
  const stepMs = 5 * 60 * 1000
  const steps = (hours * 60 * 60 * 1000) / stepMs

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]
      const b = objects[j]
      let bestDist = Infinity
      let bestTime = now
      let bestRelVel = 0

      for (let s = 0; s <= steps; s++) {
        const t = new Date(now + s * stepMs)
        const pa = eciAt(a.tle1, a.tle2, t)
        const pb = eciAt(b.tle1, b.tle2, t)
        if (!pa || !pb) continue
        const dx = pa.position.x - pb.position.x
        const dy = pa.position.y - pb.position.y
        const dz = pa.position.z - pb.position.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < bestDist) {
          bestDist = dist
          bestTime = t.getTime()
          const vx = pa.velocity.x - pb.velocity.x
          const vy = pa.velocity.y - pb.velocity.y
          const vz = pa.velocity.z - pb.velocity.z
          bestRelVel = Math.sqrt(vx * vx + vy * vy + vz * vz)
        }
      }

      found.push({
        id: nextConjunctionId++,
        object1: { norad_id: a.norad_id, name: a.name },
        object2: { norad_id: b.norad_id, name: b.name },
        tca_time: new Date(bestTime).toISOString(),
        miss_distance_km: bestDist,
        relative_velocity_km_s: bestRelVel,
        risk_score: riskScore(bestDist, bestRelVel),
      })
    }
  }

  found.sort((x, y) => x.miss_distance_km - y.miss_distance_km)
  conjunctions = found.slice(0, 8).sort((x, y) => y.risk_score - x.risk_score)
}

export function computeBatchConjunctions(norad_ids: number[]) {
  const cById = getCatalogById()
  const objects = norad_ids
    .map(id => cById.get(id))
    .filter(Boolean)
    .map(e => ({ ...e!, type: 'UNKNOWN', size: 'UNKNOWN' }))
  
  const found: ConjunctionRecord[] = []
  const now = Date.now()
  const hours = 12
  const stepMs = 5 * 60 * 1000
  const steps = (hours * 60 * 60 * 1000) / stepMs
  
  let tempId = 1
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]
      const b = objects[j]
      let bestDist = Infinity
      let bestTime = now
      let bestRelVel = 0

      for (let s = 0; s <= steps; s++) {
        const t = new Date(now + s * stepMs)
        const pa = eciAt(a.tle1, a.tle2, t)
        const pb = eciAt(b.tle1, b.tle2, t)
        if (!pa || !pb) continue
        const dx = pa.position.x - pb.position.x
        const dy = pa.position.y - pb.position.y
        const dz = pa.position.z - pb.position.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < bestDist) {
          bestDist = dist
          bestTime = t.getTime()
          const vx = pa.velocity.x - pb.velocity.x
          const vy = pa.velocity.y - pb.velocity.y
          const vz = pa.velocity.z - pb.velocity.z
          bestRelVel = Math.sqrt(vx * vx + vy * vy + vz * vz)
        }
      }

      found.push({
        id: tempId++,
        object1: { norad_id: a.norad_id, name: a.name },
        object2: { norad_id: b.norad_id, name: b.name },
        tca_time: new Date(bestTime).toISOString(),
        miss_distance_km: bestDist,
        relative_velocity_km_s: bestRelVel,
        risk_score: riskScore(bestDist, bestRelVel),
      })
    }
  }

  found.sort((x, y) => x.miss_distance_km - y.miss_distance_km)
  return found.slice(0, 8).sort((x, y) => y.risk_score - x.risk_score)
}

export function toClientObject(obj: TrackedObjectRecord) {
  try {
    const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2)
    const now = new Date()
    const pv = satellite.propagate(satrec, now)
    if (!pv.position || typeof pv.position === 'boolean') {
      return {
        norad_id: obj.norad_id,
        name: obj.name,
        type: obj.type,
        size: obj.size,
        tle1: obj.tle1,
        tle2: obj.tle2,
      }
    }
    const gmst = satellite.gstime(now)
    const gd = satellite.eciToGeodetic(pv.position, gmst)
    return {
      norad_id: obj.norad_id,
      name: obj.name,
      type: obj.type,
      size: obj.size,
      lat: satellite.degreesLat(gd.latitude),
      lng: satellite.degreesLong(gd.longitude),
      alt: gd.height / EARTH_RADIUS_KM,
      tle1: obj.tle1,
      tle2: obj.tle2,
    }
  } catch {
    return {
      norad_id: obj.norad_id,
      name: obj.name,
      type: obj.type,
      size: obj.size,
      tle1: obj.tle1,
      tle2: obj.tle2,
    }
  }
}

export function listObjects() {
  ensureSeeded()
  return [...tracked.values()].map(toClientObject)
}

export function listConjunctions() {
  ensureSeeded()
  return conjunctions
}

export function searchCatalog(query: string) {
  const q = query.trim()
  if (!q) return []
  const all = getCatalog()
  if (/^\d+$/.test(q)) {
    const id = Number.parseInt(q, 10)
    return all
      .filter((entry) => entry.norad_id === id)
      .slice(0, 10)
      .map(({ norad_id, name }) => ({ norad_id, name }))
  }
  const needle = q.toUpperCase()
  return all
    .filter((entry) => entry.name.toUpperCase().includes(needle))
    .slice(0, 10)
    .map(({ norad_id, name }) => ({ norad_id, name }))
}

export function addObject(noradId: number) {
  ensureSeeded()
  if (tracked.has(noradId)) return { status: 'already tracked' as const }
  const entry = getCatalogById().get(noradId)
  if (!entry) return { error: 'not found in master catalog' as const }
  if (tracked.size >= MAX_TRACKED) {
    return { error: `tracked object limit is ${MAX_TRACKED}` as const }
  }
  tracked.set(noradId, { ...entry, type: 'UNKNOWN', size: 'UNKNOWN' })
  recomputeConjunctions()
  return { status: 'success' as const }
}

export function getRandomNoradIds(count = 20) {
  const all = getCatalog()
  const available = [...all]
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  return available.slice(0, count).map(e => e.norad_id)
}

export function addRandom(count = 20) {
  ensureSeeded()
  const all = getCatalog()
  const available = all.filter((entry) => !tracked.has(entry.norad_id))
  if (available.length === 0) {
    return { status: 'success' as const, message: 'All master catalog objects are already tracked' }
  }
  const slots = Math.max(0, MAX_TRACKED - tracked.size)
  const take = Math.min(count, slots, available.length)
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  for (const entry of available.slice(0, take)) {
    tracked.set(entry.norad_id, { ...entry, type: 'UNKNOWN', size: 'UNKNOWN' })
  }
  recomputeConjunctions()
  return { status: 'success' as const, added: take }
}

export function clearObjects() {
  tracked.clear()
  conjunctions = []
  seeded = true
  return { status: 'success' as const }
}
