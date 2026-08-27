'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as satellite from 'satellite.js';

export type TrackedObject = {
  norad_id: number;
  name: string;
  type: string;
  size: string;
  tle1: string;
  tle2: string;
  lat?: number;
  lng?: number;
  alt?: number;
};

export type Conjunction = {
  id: number;
  object1: { norad_id: number; name: string };
  object2: { norad_id: number; name: string };
  tca_time: string;
  miss_distance_km: number;
  relative_velocity_km_s: number;
  risk_score: number;
};

type OrbitalContextType = {
  trackedObjects: TrackedObject[];
  conjunctions: Conjunction[];
  currentTime: Date;
  refreshData: () => void;
  focusedObjectId: number | null;
  setFocusedObjectId: (id: number | null) => void;
};

const OrbitalContext = createContext<OrbitalContextType | undefined>(undefined);

export function OrbitalProvider({ children }: { children: React.ReactNode }) {
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [focusedObjectId, setFocusedObjectId] = useState<number | null>(null);

  const fetchData = () => {
    fetch('/api/objects')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setTrackedObjects(data);
      });
    
    fetch('/api/conjunctions')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setConjunctions(data);
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Fetch every 30s
    return () => clearInterval(interval);
  }, []);

  // Timer for real-time propagation
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = 0;
    
    const updatePositions = (timestamp: number) => {
      // Throttle updates to ~15fps for performance, or just update time every second
      if (timestamp - lastUpdate > 1000) {
        setCurrentTime(new Date());
        lastUpdate = timestamp;
      }
      animationFrameId = requestAnimationFrame(updatePositions);
    };
    
    animationFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <OrbitalContext.Provider value={{
        trackedObjects,
        conjunctions,
        currentTime,
        refreshData: fetchData,
        focusedObjectId,
        setFocusedObjectId
      }}
    >
      {children}
    </OrbitalContext.Provider>
  );
}

export function useOrbitalData() {
  const context = useContext(OrbitalContext);
  if (context === undefined) {
    throw new Error('useOrbitalData must be used within an OrbitalProvider');
  }
  return context;
}
