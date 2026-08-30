import re

with open('frontend/components/globe-viz.tsx', 'r') as f:
    content = f.read()

new_html_data = '''
  const focusedHtmlData = useMemo(() => {
    let result = [];
    
    if (selectedConjunctionId) {
      const conj = conjunctions.find(c => c.id === selectedConjunctionId);
      if (conj) {
        // Find one of the objects to attach the popup to
        const liveObj = (objectsData as any[]).find(o => o?.norad_id === conj.object1.norad_id || o?.norad_id === conj.object2.norad_id);
        if (liveObj) {
          result.push({
            lat: liveObj.lat,
            lng: liveObj.lng,
            alt: liveObj.alt,
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
  }, [focusedObjectId, selectedConjunctionId, trackedObjects, conjunctions, objectsData]);
'''

# Use regex to replace the entire focusedHtmlData block
pattern = re.compile(r'const focusedHtmlData = useMemo\(\(\) => \{.*?\n  \}, \[.*?\]\);', re.DOTALL)
content = pattern.sub(new_html_data.strip(), content)

with open('frontend/components/globe-viz.tsx', 'w') as f:
    f.write(content)
