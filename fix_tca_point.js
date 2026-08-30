const fs = require('fs');
let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

// 1. Fix useEffect to use tca_time for camera position
const useEffectRegex = /useEffect\(\(\) => \{\s*if \(\!globeRef\.current\) return;\s*if \(selectedConjunctionId[\s\S]*?const now = new Date\(\);/g;
const replacementEffect = \useEffect(() => {
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
            const now = new Date(conj.tca_time);\;

content = content.replace(useEffectRegex, replacementEffect);

// 2. Fix focusedHtmlData to place the red dot at tca_time instead of live position
const htmlDataRegex = /if \(liveObj1 && liveObj2\) \{[\s\S]*?const alt = \(liveObj1\.alt \+ liveObj2\.alt\) \/ 2;/g;

const replacementHtmlData = \if (liveObj1 && liveObj2) {
          let lat = 0;
          let lng = 0;
          let alt = 2;
          
          const o1 = trackedObjects.find(o => o.norad_id === conj.object1.norad_id);
          const o2 = trackedObjects.find(o => o.norad_id === conj.object2.norad_id);
          
          if (o1 && o2 && o1.tle1 && o2.tle1) {
            try {
              const satrec1 = satellite.twoline2satrec(o1.tle1, o1.tle2);
              const satrec2 = satellite.twoline2satrec(o2.tle1, o2.tle2);
              const tca = new Date(conj.tca_time);
              const pv1 = satellite.propagate(satrec1, tca);
              const pv2 = satellite.propagate(satrec2, tca);
              if (pv1.position && pv2.position) {
                const gmst = satellite.gstime(tca);
                const p1 = satellite.eciToGeodetic(pv1.position as satellite.EciVec3<number>, gmst);
                const p2 = satellite.eciToGeodetic(pv2.position as satellite.EciVec3<number>, gmst);
                lat = (satellite.degreesLat(p1.latitude) + satellite.degreesLat(p2.latitude)) / 2;
                let lng1 = satellite.degreesLong(p1.longitude);
                let lng2 = satellite.degreesLong(p2.longitude);
                let lngDiff = lng2 - lng1;
                if (Math.abs(lngDiff) > 180) lngDiff = lngDiff > 0 ? lngDiff - 360 : lngDiff + 360;
                lng = lng1 + lngDiff / 2;
                if (lng > 180) lng -= 360;
                if (lng < -180) lng += 360;
                alt = ((p1.height + p2.height) / 2) / 6371;
              }
            } catch {}
          }\;

content = content.replace(htmlDataRegex, replacementHtmlData);

fs.writeFileSync('frontend/components/globe-viz.tsx', content);
