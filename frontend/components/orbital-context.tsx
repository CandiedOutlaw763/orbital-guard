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
  const [activeView, setActiveView] = useState<DashboardView>('globe')
  const [selectedConjunctionId, setSelectedConjunctionId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchData = () => {
    fetch('/api/objects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrackedObjects(data)
      })
      .catch(() => {})

    fetch('/api/conjunctions')
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setConjunctions(data)
        setSelectedConjunctionId((current) => {
          if (current != null && data.some((item: Conjunction) => item.id === current)) {
            return current
          }
          return data[0]?.id ?? null
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

  return (
    <OrbitalContext.Provider
      value={{
        trackedObjects,
        conjunctions,
        currentTime,
        refreshData: fetchData,
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
