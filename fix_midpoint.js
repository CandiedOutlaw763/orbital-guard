const fs = require('fs');
let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

const replacement = \  const focusedHtmlData = useMemo(() => {
    let result = [];
    
    if (selectedConjunctionId) {
      const conj = conjunctions.find(c => c.id === selectedConjunctionId);
      if (conj) {
        const liveObj1 = (objectsData as any[]).find(o => o?.norad_id === conj.object1.norad_id);
        const liveObj2 = (objectsData as any[]).find(o => o?.norad_id === conj.object2.norad_id);
        
        if (liveObj1 && liveObj2) {
          // Calculate midpoint
          const lat = (liveObj1.lat + liveObj2.lat) / 2;
          
          // Handle longitude wrapping for midpoint
          let lngDiff = liveObj2.lng - liveObj1.lng;
          if (Math.abs(lngDiff) > 180) {
            if (lngDiff > 0) lngDiff -= 360;
            else lngDiff += 360;
          }
          let lng = liveObj1.lng + lngDiff / 2;
          if (lng > 180) lng -= 360;
          if (lng < -180) lng += 360;
          
          const alt = (liveObj1.alt + liveObj2.alt) / 2;

          result.push({
            lat,
            lng,
            alt,
            conj,
            isConjunctionSite: true
          });
        }
      }
    } else if (focusedObjectId) {
      const obj = trackedObjects.find(o => o.norad_id === focusedObjectId);
      const liveObj = (objectsData as any[]).find(o => o?.norad_id === focusedObjectId);
      if (obj && liveObj) {
        const conj = conjunctions
          .filter(c => c.object1.norad_id === focusedObjectId || c.object2.norad_id === focusedObjectId)
          .sort((a, b) => b.risk_score - a.risk_score)[0];
        result.push({
          lat: liveObj.lat,
          lng: liveObj.lng,
          alt: liveObj.alt,
          obj,
          conj
        });
      }
    }
    return result;
  }, [focusedObjectId, selectedConjunctionId, trackedObjects, conjunctions, objectsData]);\;

const match = content.match(/const focusedHtmlData = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/);
if (match) {
  content = content.replace(match[0], replacement);
  fs.writeFileSync('frontend/components/globe-viz.tsx', content);
  console.log('Success');
} else {
  console.log('Match not found');
}
