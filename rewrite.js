const fs = require('fs');

let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

// Add setFocusedObjectId
content = content.replace(
  'const { trackedObjects, conjunctions, currentTime, focusedObjectId } = useOrbitalData()',
  'const { trackedObjects, conjunctions, currentTime, focusedObjectId, setFocusedObjectId } = useOrbitalData()'
);

// Add onObjectClick to Globe
content = content.replace(
  'backgroundColor="#00000000"',
  \ackgroundColor="#00000000"
        onObjectClick={(obj: any) => setFocusedObjectId(obj.norad_id)}\
);

// Add focusedHtmlData
const htmlDataCode = \
  const focusedHtmlData = useMemo(() => {
    if (!focusedObjectId) return [];
    const obj = trackedObjects.find(o => o.norad_id === focusedObjectId);
    const liveObj = (objectsData as any[]).find(o => o?.norad_id === focusedObjectId);
    if (!obj || !liveObj) return [];
    
    const conj = conjunctions
      .filter(c => c.object1.norad_id === focusedObjectId || c.object2.norad_id === focusedObjectId)
      .sort((a, b) => b.risk_score - a.risk_score)[0];

    return [{
       lat: liveObj.lat,
       lng: liveObj.lng,
       alt: liveObj.alt,
       obj,
       conj
    }];
  }, [focusedObjectId, trackedObjects, conjunctions, objectsData]);
\;
content = content.replace(
  'return (\\n    <div ref={containerRef}',
  htmlDataCode + '\\n  return (\\n    <div ref={containerRef}'
);

// Modify pathsData colors
content = content.replace(
  /const addPaths = \(points: number\[\]\[\], color: string\) => \{/g,
  'const addPaths = (points: number[][], color: string) => {'
);

content = content.replace(
  "addPaths(pastPoints, 'rgba(239, 68, 68, 0.8)');",
  "const isFocused = focusedObjectId ? (focusedObjectId === obj.norad_id) : true;\\n        addPaths(pastPoints, isFocused ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.15)');"
);
content = content.replace(
  "addPaths(futurePoints, 'rgba(245, 158, 11, 0.8)');",
  "addPaths(futurePoints, isFocused ? 'rgba(245, 158, 11, 1)' : 'rgba(245, 158, 11, 0.15)');"
);
// We need to add focusedObjectId to pathsData dependencies!
content = content.replace(
  '}, [trackedObjects, timeMinute]);',
  '}, [trackedObjects, timeMinute, focusedObjectId]);'
);

// Modify objectThreeObject to highlight sprite
content = content.replace(
  /objectThreeObject=\{\(\) => \{/g,
  'objectThreeObject={(d: any) => {'
);
content = content.replace(
  'return new THREE.Mesh(',
  'const isFocused = focusedObjectId ? (focusedObjectId === d.norad_id) : true;\\n          return new THREE.Mesh('
);
content = content.replace(
  'new THREE.MeshBasicMaterial({ color: 0xffffff })',
  'new THREE.MeshBasicMaterial({ color: isFocused ? 0xffffff : 0x444444 })'
);
content = content.replace(
  'const material = new THREE.SpriteMaterial({ map: satTexture, color: 0xffffff });',
  'const isFocused = focusedObjectId ? (focusedObjectId === d.norad_id) : true;\\n          const material = new THREE.SpriteMaterial({ map: satTexture, color: isFocused ? 0xffffff : 0x444444 });'
);
content = content.replace(
  'sprite.scale.set(4, 4, 1);',
  'const size = isFocused ? 8 : 4;\\n          sprite.scale.set(size, size, 1);'
);

// Add htmlElementsData props to Globe
const htmlProps = \
        htmlElementsData={focusedHtmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="alt"
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'default';
          
          if (!d.conj) {
            el.innerHTML = \\\
              <div class="bg-[#0b101a]/90 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md w-64 translate-x-4 -translate-y-4">
                <div class="text-sm font-semibold text-white tracking-wider truncate">\\\</div>
                <div class="text-[10px] text-white/50 tracking-[0.2em] mt-1 uppercase">\\\</div>
                <div class="mt-3 pt-3 border-t border-white/10 flex justify-between">
                  <div>
                    <div class="text-xs text-white/50 tracking-wider">NORAD ID</div>
                    <div class="text-sm text-white font-mono mt-0.5">\\\</div>
                  </div>
                </div>
              </div>
            \\\;
            return el;
          }

          const conj = d.conj;
          const isHighRisk = conj.risk_score > 7;
          const riskColor = isHighRisk ? 'text-red-500' : 'text-orange-500';
          const riskBg = isHighRisk ? 'bg-red-500/20' : 'bg-orange-500/20';
          const riskText = isHighRisk ? 'HIGH RISK' : 'MODERATE RISK';
          
          const tcaObj = new Date(conj.tca_time);
          const tcaStr = tcaObj.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC';
          const prob = (conj.risk_score * 1.2).toFixed(1) + '%';
          
          el.innerHTML = \\\
            <div class="bg-[#0b101a]/90 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md w-[340px] translate-x-6 -translate-y-12 font-sans overflow-hidden">
              <div class="flex items-center justify-between p-4 border-b border-white/10">
                <div class="flex items-center gap-3">
                  <span class="text-red-500 font-mono text-sm tracking-widest uppercase">Conjunction #\\\</span>
                  <span class="\\\ \\\ text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">\\\</span>
                </div>
              </div>
              <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <div class="flex-1 overflow-hidden">
                  <div class="text-[#38bdf8] font-mono text-base truncate" title="\\\">\\\</div>
                  <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">SATELLITE</div>
                </div>
                <div class="px-3 text-white/40 text-xs font-mono">VS</div>
                <div class="flex-1 text-right overflow-hidden">
                  <div class="text-red-500 font-mono text-base truncate" title="\\\">\\\</div>
                  <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">DEBRIS</div>
                </div>
              </div>
              <div class="grid grid-cols-2 p-4 gap-y-5 gap-x-4">
                <div>
                  <div class="text-white font-mono text-base">\\\ km</div>
                  <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">Closest Approach</div>
                </div>
                <div>
                  <div class="text-white font-mono text-base">\\\</div>
                  <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase">TCA</div>
                </div>
                <div>
                  <div class="text-white font-mono text-base">\\\</div>
                  <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">Collision Prob</div>
                </div>
                <div>
                  <div class="text-white font-mono text-base">\\\ km/s</div>
                  <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">Rel Velocity</div>
                </div>
              </div>
            </div>
          \\\;
          return el;
        }}
\;

content = content.replace(
  'backgroundColor="#00000000"',
  htmlProps + '\\n        backgroundColor="#00000000"'
);

fs.writeFileSync('frontend/components/globe-viz.tsx', content);
