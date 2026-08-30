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
  const { trackedObjects, conjunctions, currentTime, focusedObjectId, setFocusedObjectId, selectedConjunctionId, setSelectedConjunctionId } = useOrbitalData();
  const [size, setSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownPos = useRef<{x: number, y: number} | null>(null);

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

  // Disable damping so pointOfView lands exactly where specified
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.enableDamping = false;
      }
    }
  })

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

        let velocity = 0;
        if (positionAndVelocity.velocity) {
          const v = positionAndVelocity.velocity as satellite.EciVec3<number>;
          velocity = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }

        const inclination = parseFloat(obj.tle2.substring(8, 16));

        // Extract launch year from TLE
        let launchYear = 'Unknown';
        if (obj.tle1) {
          const yearDigits = parseInt(obj.tle1.substring(9, 11), 10);
          launchYear = yearDigits > 56 ? `19${yearDigits}` : `20${yearDigits.toString().padStart(2, '0')}`;
        }
        const launchDate = obj.launch_date || launchYear;

        return {
          ...obj,
          lat,
          lng,
          alt,
          heightKm: positionGd.height,
          velocity,
          inclination,
          launchDate
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
        
        let isFocused = false;
        // Do NOT highlight orbits for conjunctions, ONLY for satellites
        if (focusedObjectId && !selectedConjunctionId) {
          isFocused = (focusedObjectId === obj.norad_id);
        }

        // Helper to split paths at the anti-meridian
        const addPaths = (points: number[][], color: string) => {
          let currentSegment: number[][] = [];
          
          const pushSegment = (segment: number[][]) => {
            if (segment.length > 1) {
              paths.push({ path: segment, color, norad_id: obj.norad_id, isFocused });
              if (isFocused) {
                // Push a thicker, lower-opacity segment behind it to simulate a glow
                paths.push({ path: segment, color: color.replace('0.8)', '0.3)'), norad_id: obj.norad_id, isFocused: true, isGlow: true });
              }
            }
          };

          for (let i = 0; i < points.length; i++) {
            if (i > 0) {
              const prevLng = points[i - 1][1];
              const currLng = points[i][1];
              if (Math.abs(currLng - prevLng) > 180) {
                pushSegment(currentSegment);
                currentSegment = [];
              }
            }
            currentSegment.push(points[i]);
          }
          pushSegment(currentSegment);
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
  }, [trackedObjects, timeMinute, focusedObjectId, selectedConjunctionId, conjunctions]);

  const focusedHtmlData = useMemo(() => {
    let result = [];
    
    if (selectedConjunctionId) {
      const conj = conjunctions.find(c => c.id === selectedConjunctionId);
      if (conj) {
        const o1 = trackedObjects.find(o => o.norad_id === conj.object1.norad_id);
        if (o1 && o1.tle1 && o1.tle2) {
          try {
            const satrec = satellite.twoline2satrec(o1.tle1, o1.tle2);
            const tca = new Date(conj.tca_time);
            const pv = satellite.propagate(satrec, tca);
            if (pv.position) {
              const gmst = satellite.gstime(tca);
              const pGd = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
              const lat = satellite.degreesLat(pGd.latitude);
              const lng = satellite.degreesLong(pGd.longitude);
              
              result.push({
                lat, lng, alt: 0,
                conj,
                isConjunctionSite: true
              });
            }
          } catch {}
        }
      }
    } else if (focusedObjectId) {
      const obj = trackedObjects.find(o => o.norad_id === focusedObjectId);
      const liveObj = (objectsData as any[]).find(o => o?.norad_id === focusedObjectId);
      if (obj && liveObj) {
        result.push({
          lat: liveObj.lat,
          lng: liveObj.lng,
          alt: 0,
          obj,
          liveObj
        });
      }
    }
    return result;
  }, [focusedObjectId, selectedConjunctionId, trackedObjects, conjunctions, objectsData]);

  const prevSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!globeRef.current) return;
    if (focusedHtmlData.length === 0) {
      prevSelectionRef.current = null;
      return;
    }
    
    const key = `${selectedConjunctionId}-${focusedObjectId}`;
    if (key === prevSelectionRef.current) return;
    prevSelectionRef.current = key;
    
    const d = focusedHtmlData[0];
    globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.8 }, 1000);
  }, [focusedHtmlData]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden"
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const start = pointerDownPos.current;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) {
          if (focusedObjectId) setFocusedObjectId(null);
          if (selectedConjunctionId) setSelectedConjunctionId(null);
        }
      }}
      onPointerUp={(e) => {
        pointerDownPos.current = null;
      }}
    >
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
        objectThreeObject={(d: any) => {
          
          let isFocused = true;
          if (selectedConjunctionId) {
            const c = conjunctions.find(cj => cj.id === selectedConjunctionId);
            if (c) {
              isFocused = (c.object1.norad_id === d.norad_id || c.object2.norad_id === d.norad_id);
            }
          } else if (focusedObjectId) {
            isFocused = (focusedObjectId === d.norad_id);
          }

          if (!satTexture) {
            return new THREE.Mesh(
              new THREE.SphereGeometry(isFocused ? 1.2 : 0.75),
              new THREE.MeshBasicMaterial({ color: isFocused ? 0xffffff : 0xffffff })
            );
          }
          const material = new THREE.SpriteMaterial({ map: satTexture, color: isFocused ? 0xffffff : 0xffffff });
          const sprite = new THREE.Sprite(material);
          const size = isFocused ? 4.8 : 2.6;
          sprite.scale.set(size, size, 1);
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
        onPathClick={(path: any) => {
          setFocusedObjectId(path.norad_id);
          setSelectedConjunctionId(null);
        }}
        pathStroke={(d: any) => d.isGlow ? 12 : (d.isFocused ? 2 : 1.5)}
        backgroundColor="#00000000"
        onObjectClick={(obj: any) => {
          setFocusedObjectId(obj.norad_id);
          setSelectedConjunctionId(null);
        }}
        onGlobeClick={() => {
          setFocusedObjectId(null)
          setSelectedConjunctionId(null)
        }}
        htmlElementsData={focusedHtmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="alt"
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'default';
          el.style.width = '0px';
          el.style.height = '0px';
          
          if (!d.conj) {
            const op = d.obj.operator || (d.obj.name.includes('STARLINK') ? 'SpaceX' : 'Unknown');
            const typeLabel = d.obj.object_type === 'PAYLOAD' ? 'Communication Satellite' : (d.obj.object_type || 'Satellite');
            
            el.innerHTML = `
              <div class="relative group">
                <div class="bg-[#0b101a]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md w-[340px] translate-x-3 translate-y-3 font-sans overflow-hidden">
                  <div class="flex items-center justify-between p-4 border-b border-white/10">
                    <div class="flex items-center gap-3">
                      <span class="text-blue-400 font-mono text-sm tracking-widest uppercase">NORAD ID: ${d.obj.norad_id}</span>
                      <span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">TRACKING</span>
                    </div>
                  </div>
                  <div class="p-4 border-b border-white/10">
                    <div class="text-[#38bdf8] font-mono text-lg truncate">${d.obj.name}</div>
                    <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">${typeLabel}</div>
                  </div>
                  <div class="grid grid-cols-2 p-4 gap-y-4 gap-x-4 bg-white/5">
                    <div>
                      <div class="text-white font-mono text-[13px]">${op}</div>
                      <div class="text-white/50 text-[9px] tracking-wider mt-1 uppercase truncate">OPERATOR</div>
                    </div>
                    <div>
                      <div class="text-white font-mono text-[13px]">${d.liveObj.launchDate}</div>
                      <div class="text-white/50 text-[9px] tracking-wider mt-1 uppercase">LAUNCH DATE</div>
                    </div>
                  </div>
                  <div class="grid grid-cols-3 p-4 gap-y-4 gap-x-2">
                    <div>
                      <div class="text-white font-mono text-sm">${Math.round(d.liveObj.heightKm)} km</div>
                      <div class="text-white/50 text-[9px] tracking-wider mt-1 uppercase truncate">ALTITUDE</div>
                    </div>
                    <div>
                      <div class="text-white font-mono text-sm">${d.liveObj.inclination.toFixed(1)}&deg;</div>
                      <div class="text-white/50 text-[9px] tracking-wider mt-1 uppercase">INCLINATION</div>
                    </div>
                    <div>
                      <div class="text-white font-mono text-sm">${d.liveObj.velocity.toFixed(2)} km/s</div>
                      <div class="text-white/50 text-[9px] tracking-wider mt-1 uppercase truncate">VELOCITY</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
            return el;
          }

          const conj = d.conj;
          const isHighRisk = conj.risk_score > 7;
          const riskColor = isHighRisk ? 'text-red-500' : conj.risk_score > 4 ? 'text-orange-500' : 'text-blue-500';
          const riskBg = isHighRisk ? 'bg-red-500/20' : conj.risk_score > 4 ? 'bg-orange-500/20' : 'bg-blue-500/20';
          const riskText = isHighRisk ? 'HIGH RISK' : conj.risk_score > 4 ? 'MODERATE RISK' : 'LOW RISK';
          
          const tcaObj = new Date(conj.tca_time);
          const tcaStr = tcaObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC';
          const prob = (conj.risk_score * 1.2).toFixed(1) + '%';
          
          el.innerHTML = `
            <div class="relative group">
              <div class="absolute left-0 top-0 w-4 h-4 bg-red-500 rounded-full animate-ping -translate-x-2 -translate-y-2 opacity-75"></div>
              <div class="absolute left-0 top-0 w-3 h-3 bg-red-600 rounded-full border-2 border-white -translate-x-1.5 -translate-y-1.5 shadow-[0_0_15px_rgba(220,38,38,1)]"></div>

              <div class="bg-[#0b101a]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md w-[340px] translate-x-4 translate-y-4 font-sans overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-white/10">
                  <div class="flex items-center gap-3">
                    <span class="text-red-500 font-mono text-sm tracking-widest uppercase">CONJUNCTION #${(conj.id || 1).toString().padStart(2, '0')}</span>
                    <span class="${riskBg} ${riskColor} text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">${riskText}</span>
                  </div>
                  <svg class="w-4 h-4 text-white/50 hover:text-white cursor-pointer transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </div>
                <div class="p-4 border-b border-white/10 flex items-center justify-between">
                  <div class="flex-1 overflow-hidden">
                    <div class="text-[#38bdf8] font-mono text-base truncate" title="${conj.object1?.name}">${conj.object1?.name}</div>
                    <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">SATELLITE</div>
                  </div>
                  <div class="px-3 text-white/40 text-xs font-mono">VS</div>
                  <div class="flex-1 text-right overflow-hidden">
                    <div class="text-red-500 font-mono text-base truncate" title="${conj.object2?.name}">${conj.object2?.name}</div>
                    <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">DEBRIS</div>
                  </div>
                </div>
                <div class="grid grid-cols-2 p-4 gap-y-5 gap-x-4">
                  <div>
                    <div class="text-white font-mono text-base">${conj.miss_distance_km.toFixed(1)} km</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">CLOSEST APPROACH</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">${tcaStr}</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase">TCA</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">${prob}</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">COLLISION PROBABILITY</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">${conj.relative_velocity_km_s.toFixed(1)} km/s</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">RELATIVE VELOCITY</div>
                  </div>
                </div>
              </div>
            </div>
          `;
          return el;
        }}
      />
    </div>
  );
})

export default GlobeViz
