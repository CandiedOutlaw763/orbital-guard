'use client'

import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';
import { useOrbitalData } from './orbital-context';

import * as THREE from 'three';

export type GlobeHandle = {
  zoomIn: () => void
  zoomOut: () => void
  center: () => void
}

const GlobeViz = forwardRef<GlobeHandle, { onReady?: (handle: GlobeHandle) => void }>(function GlobeViz({ onReady }, ref) {
  const globeRef = useRef<any>(null);
  const { trackedObjects, conjunctions, currentTime, focusedObjectId } = useOrbitalData();
  const [size, setSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  const commands = () => ({
    zoomIn() {
      const pov = globeRef.current?.pointOfView?.() as { altitude?: number } | undefined
      const alt = typeof pov?.altitude === 'number' ? pov.altitude : 2.4
      globeRef.current?.pointOfView({ altitude: Math.max(0.45, alt * 0.72) }, 400)
    },
    zoomOut() {
      const pov = globeRef.current?.pointOfView?.() as { altitude?: number } | undefined
      const alt = typeof pov?.altitude === 'number' ? pov.altitude : 2.4
      globeRef.current?.pointOfView({ altitude: Math.min(6.5, alt * 1.35) }, 400)
    },
    center() {
      globeRef.current?.pointOfView({ lat: 20, lng: 78, altitude: 2.35 }, 800)
    },
  })

  useImperativeHandle(ref, () => commands())

  useEffect(() => {
    onReady?.(commands())
  }, [onReady])

  useEffect(() => {
    if (focusedObjectId && globeRef.current && trackedObjects) {
      const obj = trackedObjects.find(o => o.norad_id === focusedObjectId);
      if (obj && obj.tle1 && obj.tle2) {
        try {
          const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
          const positionAndVelocity = satellite.propagate(satrec, new Date());
          if (positionAndVelocity.position) {
            const gmst = satellite.gstime(new Date());
            const positionGd = satellite.eciToGeodetic(positionAndVelocity.position as satellite.EciVec3<number>, gmst);
            const lat = satellite.degreesLat(positionGd.latitude);
            const lng = satellite.degreesLong(positionGd.longitude);
            globeRef.current.pointOfView({ lat, lng, altitude: 2 }, 1000);
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [focusedObjectId, trackedObjects]);

  // Load satellite texture for sprites
  const [satTexture, setSatTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    new THREE.TextureLoader().load('/images/sat-icon.png', texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      setSatTexture(texture);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Use satellite.js to compute positions for the current time
  const objectsData = useMemo(() => {
    return trackedObjects.map(obj => {
      if (!obj.tle1 || !obj.tle2) return null;
      try {
        const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
        const positionAndVelocity = satellite.propagate(satrec, currentTime);
        if (!positionAndVelocity.position) return null;
        
        const gmst = satellite.gstime(currentTime);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position as satellite.EciVec3<number>, gmst);
        
        const lat = satellite.degreesLat(positionGd.latitude);
        const lng = satellite.degreesLong(positionGd.longitude);
        const alt = positionGd.height / 6371; // Relative to Earth radius

        return {
          ...obj,
          lat,
          lng,
          alt
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [trackedObjects, currentTime]);

  const arcsData = useMemo(() => {
    const validObjects = objectsData.filter(Boolean) as any[];
    const arcs: any[] = [];
    conjunctions.forEach(c => {
      if (c.risk_score > 4) {
        const o1 = validObjects.find(o => o.norad_id === c.object1?.norad_id);
        const o2 = validObjects.find(o => o.norad_id === c.object2?.norad_id);
        if (o1 && o2) {
          arcs.push({
            startLat: o1.lat,
            startLng: o1.lng,
            endLat: o2.lat,
            endLng: o2.lng,
            color: c.risk_score > 7 ? 'rgba(255,0,0,0.8)' : 'rgba(255,165,0,0.8)',
          });
        }
      }
    });
    return arcs;
  }, [conjunctions, objectsData]);

  // Compute paths once per minute to save CPU
  const timeMinute = Math.floor(currentTime.getTime() / 60000);
  const pathsData = useMemo(() => {
    const paths: any[] = [];
    const baseTime = new Date(timeMinute * 60000);
    
    trackedObjects.forEach(obj => {
      if (!obj.tle1 || !obj.tle2) return;
      try {
        const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
        
        // Helper to split paths at the anti-meridian
        const addPaths = (points: number[][], color: string) => {
          let currentSegment: number[][] = [];
          for (let i = 0; i < points.length; i++) {
            if (i > 0) {
              const prevLng = points[i - 1][1];
              const currLng = points[i][1];
              if (Math.abs(currLng - prevLng) > 180) {
                // Crossed anti-meridian, push current segment and start a new one
                if (currentSegment.length > 1) {
                  paths.push({ path: currentSegment, color });
                }
                currentSegment = [];
              }
            }
            currentSegment.push(points[i]);
          }
          if (currentSegment.length > 1) {
            paths.push({ path: currentSegment, color });
          }
        };

        // Generate past path (T-45m to T)
        const pastPoints = [];
        for (let i = -45; i <= 0; i += 2) { // 2-minute steps
          const t = new Date(baseTime.getTime() + i * 60000);
          const posVel = satellite.propagate(satrec, t);
          if (posVel.position) {
            const gmst = satellite.gstime(t);
            const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
            pastPoints.push([
              satellite.degreesLat(posGd.latitude),
              satellite.degreesLong(posGd.longitude),
              posGd.height / 6371
            ]);
          }
        }
        addPaths(pastPoints, 'rgba(239, 68, 68, 0.8)'); // Destructive color

        // Generate future path (T to T+45m)
        const futurePoints = [];
        for (let i = 0; i <= 45; i += 2) {
          const t = new Date(baseTime.getTime() + i * 60000);
          const posVel = satellite.propagate(satrec, t);
          if (posVel.position) {
            const gmst = satellite.gstime(t);
            const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
            futurePoints.push([
              satellite.degreesLat(posGd.latitude),
              satellite.degreesLong(posGd.longitude),
              posGd.height / 6371
            ]);
          }
        }
        addPaths(futurePoints, 'rgba(245, 158, 11, 0.8)'); // Warning color
      } catch {
        // Ignore parsing errors
      }
    });
    return paths;
  }, [trackedObjects, timeMinute]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        objectsData={objectsData as any[]}
        objectLabel="name"
        objectLat="lat"
        objectLng="lng"
        objectAltitude="alt"
        objectThreeObject={() => {
          if (!satTexture) {
            return new THREE.Mesh(
              new THREE.SphereGeometry(2),
              new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
          }
          const material = new THREE.SpriteMaterial({ map: satTexture, color: 0xffffff });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(4, 4, 1);
          return sprite;
        }}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        pathsData={pathsData}
        pathPoints="path"
        pathPointLat={d => d[0]}
        pathPointLng={d => d[1]}
        pathPointAlt={d => d[2]}
        pathColor="color"
        pathStroke={2}
        backgroundColor="#00000000"
      />
    </div>
  );
})

export default GlobeViz
