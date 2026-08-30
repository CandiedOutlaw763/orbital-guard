const fs = require('fs');
let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

// 1. Modify useEffect to center on conjunction
const newUseEffect = \  useEffect(() => {
    if (!globeRef.current) return;
    
    if (selectedConjunctionId && conjunctions && trackedObjects) {
      const conj = conjunctions.find(c => c.id === selectedConjunctionId);
      if (conj) {
        const o1 = trackedObjects.find(o => o.norad_id === conj.object1.norad_id);
        const o2 = trackedObjects.find(o => o.norad_id === conj.object2.norad_id);
        if (o1 && o2 && o1.tle1 && o2.tle1) {
          try {
            const satrec1 = satellite.twoline2satrec(o1.tle1, o1.tle2);
            const satrec2 = satellite.twoline2satrec(o2.tle1, o2.tle2);
            const now = new Date();
            const pv1 = satellite.propagate(satrec1, now);
            const pv2 = satellite.propagate(satrec2, now);
            if (pv1.position && pv2.position) {
              const gmst = satellite.gstime(now);
              const pGd1 = satellite.eciToGeodetic(pv1.position as satellite.EciVec3<number>, gmst);
              const pGd2 = satellite.eciToGeodetic(pv2.position as satellite.EciVec3<number>, gmst);
              const lat1 = satellite.degreesLat(pGd1.latitude);
              const lng1 = satellite.degreesLong(pGd1.longitude);
              const lat2 = satellite.degreesLat(pGd2.latitude);
              const lng2 = satellite.degreesLong(pGd2.longitude);
              const lat = (lat1 + lat2) / 2;
              let lngDiff = lng2 - lng1;
              if (Math.abs(lngDiff) > 180) {
                lngDiff = lngDiff > 0 ? lngDiff - 360 : lngDiff + 360;
              }
              let lng = lng1 + lngDiff / 2;
              if (lng > 180) lng -= 360;
              if (lng < -180) lng += 360;
              globeRef.current.pointOfView({ lat, lng, altitude: 2 }, 1000);
            }
          } catch {}
        }
      }
    } else if (focusedObjectId && trackedObjects) {
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
        }
      }
    }
  }, [focusedObjectId, selectedConjunctionId, trackedObjects, conjunctions]);\

content = content.replace(/useEffect\(\(\) => \{\s*if \(focusedObjectId[\s\S]*?\}, \[focusedObjectId, trackedObjects\]\);/, newUseEffect);

// 2. Add pointer events to container to dismiss on drag
content = content.replace(
  'const [size, setSize] = useState({ width: 800, height: 600 });',
  'const [size, setSize] = useState({ width: 800, height: 600 });\\n  const pointerDownPos = useRef<{x: number, y: number} | null>(null);'
);

content = content.replace(
  '<div ref={containerRef} className="absolute inset-0 overflow-hidden">',
  \<div ref={containerRef} className="absolute inset-0 overflow-hidden"
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = pointerDownPos.current;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) {
          setFocusedObjectId(null);
          setSelectedConjunctionId(null);
        }
        pointerDownPos.current = null;
      }}
    >\
);

// 3. Add isFocused to pathsData
content = content.replace(
  'paths.push({ path: currentSegment, color, norad_id: obj.norad_id });',
  'paths.push({ path: currentSegment, color, norad_id: obj.norad_id, isFocused });'
);
content = content.replace(
  'paths.push({ path: currentSegment, color, norad_id: obj.norad_id });',
  'paths.push({ path: currentSegment, color, norad_id: obj.norad_id, isFocused });'
);

// 4. Update pathStroke to make focused paths thicker
content = content.replace(
  'pathStroke={2}',
  'pathStroke={(d: any) => d.isFocused ? 4 : 1}'
);

// Clean up duplicate onPathClick if it exists
content = content.replace(
  'onPathClick={(path: any) => setFocusedObjectId(path.norad_id)}\\n        pathStroke',
  'pathStroke'
);

fs.writeFileSync('frontend/components/globe-viz.tsx', content);
