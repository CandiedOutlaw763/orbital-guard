import re

with open('frontend/components/globe-viz.tsx', 'r') as f:
    content = f.read()

# 1. Update useOrbitalData to also pull selectedConjunctionId
content = content.replace(
    'const { trackedObjects, conjunctions, currentTime, focusedObjectId, setFocusedObjectId } = useOrbitalData();',
    'const { trackedObjects, conjunctions, currentTime, focusedObjectId, setFocusedObjectId, selectedConjunctionId, setSelectedConjunctionId } = useOrbitalData();'
)

# 2. Make paths clickable
content = content.replace(
    'pathColor="color"',
    'pathColor="color"\n        onPathClick={(path: any) => setFocusedObjectId(path.norad_id)}'
)

# Wait, we need norad_id in pathsData!
# Let's fix pathsData construction.
content = content.replace(
    'const addPaths = (points: number[][], color: string, isFocused: boolean) => {',
    'const addPaths = (points: number[][], color: string, isFocused: boolean, norad_id: number) => {'
)

content = content.replace(
    'paths.push({ path: currentSegment, color });',
    'paths.push({ path: currentSegment, color, norad_id });'
)

content = content.replace(
    "addPaths(pastPoints, isFocused ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.15)', isFocused);",
    "addPaths(pastPoints, isFocused ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 0.15)', isFocused, obj.norad_id);"
)
content = content.replace(
    "addPaths(futurePoints, isFocused ? 'rgba(245, 158, 11, 1)' : 'rgba(245, 158, 11, 0.15)', isFocused);",
    "addPaths(futurePoints, isFocused ? 'rgba(245, 158, 11, 1)' : 'rgba(245, 158, 11, 0.15)', isFocused, obj.norad_id);"
)

# Wait, how does isFocused work now with selectedConjunctionId?
is_focused_logic = '''
      let isFocused = true;
      if (selectedConjunctionId) {
        const c = conjunctions.find(cj => cj.id === selectedConjunctionId);
        if (c) {
          isFocused = (c.object1.norad_id === obj.norad_id || c.object2.norad_id === obj.norad_id);
        }
      } else if (focusedObjectId) {
        isFocused = (focusedObjectId === obj.norad_id);
      }
'''
content = content.replace(
    'const isFocused = focusedObjectId ? (focusedObjectId === obj.norad_id) : true;',
    is_focused_logic
)

content = content.replace(
    '}, [trackedObjects, timeMinute, focusedObjectId]);',
    '}, [trackedObjects, timeMinute, focusedObjectId, selectedConjunctionId, conjunctions]);'
)

sprite_focus_logic = '''
          let isFocused = true;
          if (selectedConjunctionId) {
            const c = conjunctions.find(cj => cj.id === selectedConjunctionId);
            if (c) {
              isFocused = (c.object1.norad_id === d.norad_id || c.object2.norad_id === d.norad_id);
            }
          } else if (focusedObjectId) {
            isFocused = (focusedObjectId === d.norad_id);
          }
'''
content = content.replace(
    'const isFocused = focusedObjectId ? (focusedObjectId === d.norad_id) : true;',
    sprite_focus_logic
)

with open('frontend/components/globe-viz.tsx', 'w') as f:
    f.write(content)
