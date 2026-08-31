'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type TrackedObject = {
  norad_id: number
  name: string
  type: string
  size: string
  tle1: string
  tle2: string
  lat?: number
  lng?: number
  alt?: number
}

export type Conjunction = {
  id: number
  object1: { norad_id: number; name: string }
  object2: { norad_id: number; name: string }
  tca_time: string
  miss_distance_km: number
  relative_velocity_km_s: number
  risk_score: number
}

export type DashboardView = 'globe' | 'risk'

type OrbitalContextType = {
  trackedObjects: TrackedObject[]
  conjunctions: Conjunction[]
  currentTime: Date
  refreshData: () => void
  addRandomObjects: (count: number) => void
  addTrackedObject: (norad_id: number) => void
  clearTrackedObjects: () => void
  focusedObjectId: number | null
  setFocusedObjectId: (id: number | null) => void
  activeView: DashboardView
  setActiveView: (view: DashboardView) => void
  selectedConjunctionId: number | null
  setSelectedConjunctionId: (id: number | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const OrbitalContext = createContext<OrbitalContextType | undefined>(undefined)

export function OrbitalProvider({ children }: { children: React.ReactNode }) {
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([])
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [focusedObjectId, setFocusedObjectId] = useState<number | null>(null)
  const [activeView, setActiveViewState] = useState<DashboardView>('globe')
  const [selectedConjunctionId, setSelectedConjunctionId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const setActiveView = (view: DashboardView) => {
    setActiveViewState(view)
    if (view === 'risk') {
      setSidebarOpen(true)
    }
  }

  const getActiveIds = (): number[] => {
    try {
      const stored = localStorage.getItem('active_norad_ids')
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  }

  const setActiveIds = (ids: number[]) => {
    localStorage.setItem('active_norad_ids', JSON.stringify(ids))
    fetchData()
  }

  const fetchData = () => {
    const activeIds = getActiveIds()
    
    // If empty and never initialized, load 20 random
    if (activeIds.length === 0 && !localStorage.getItem('has_initialized')) {
      fetch('/api/objects/random')
        .then((r) => r.json())
        .then((data) => {
          if (data.norad_ids) {
            localStorage.setItem('has_initialized', 'true')
            setActiveIds(data.norad_ids)
          }
        })
        .catch(() => {})
      return
    }

    if (activeIds.length === 0) {
      setTrackedObjects([])
      setConjunctions([])
      return
    }

    // Fetch batch objects
    fetch('/api/objects/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ norad_ids: activeIds })
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrackedObjects(data)
      })
      .catch(() => {})

    // Fetch batch conjunctions
    fetch('/api/conjunctions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ norad_ids: activeIds })
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setConjunctions(data)
        setSelectedConjunctionId((current) => {
          // Only maintain selection if it still exists. Do NOT auto-select if current is null.
          if (current != null && data.some((item: Conjunction) => item.id === current)) {
            return current
          }
          return null
        })
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeView === 'risk') {
      setSidebarOpen(true)
    }
  }, [activeView])

  useEffect(() => {
    let animationFrameId: number
    let lastUpdate = 0

    const updatePositions = (timestamp: number) => {
      if (timestamp - lastUpdate > 1000) {
        setCurrentTime(new Date())
        lastUpdate = timestamp
      }
      animationFrameId = requestAnimationFrame(updatePositions)
    }

    animationFrameId = requestAnimationFrame(updatePositions)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const addRandomObjects = (count: number) => {
    fetch('/api/objects/random')
      .then(r => r.json())
      .then(data => {
        if (data.norad_ids) {
          const activeIds = getActiveIds();
          const newIds = Array.from(new Set([...activeIds, ...data.norad_ids]));
          setActiveIds(newIds);
        }
      });
  }

  const addTrackedObject = (norad_id: number) => {
    const activeIds = getActiveIds();
    if (!activeIds.includes(norad_id)) {
      setActiveIds([...activeIds, norad_id]);
    }
  }

  const clearTrackedObjects = () => {
    setActiveIds([]);
    setTrackedObjects([]);
    setConjunctions([]);
    setFocusedObjectId(null);
    setSelectedConjunctionId(null);
  }

  return (
    <OrbitalContext.Provider
      value={{
        trackedObjects,
        conjunctions,
        currentTime,
        refreshData: fetchData,
        addRandomObjects,
        addTrackedObject,
        clearTrackedObjects,
        focusedObjectId,
        setFocusedObjectId,
        activeView,
        setActiveView,
        selectedConjunctionId,
        setSelectedConjunctionId,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </OrbitalContext.Provider>
  )
}

export function useOrbitalData() {
  const context = useContext(OrbitalContext)
  if (context === undefined) {
    throw new Error('useOrbitalData must be used within an OrbitalProvider')
  }
  return context
}
