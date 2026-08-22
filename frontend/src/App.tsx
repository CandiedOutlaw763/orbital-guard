import { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { AlertTriangle, Activity, Satellite, Info, Plus, Clock, Menu, X } from 'lucide-react';
import Plot from 'react-plotly.js';
import * as satellite from 'satellite.js';

function SearchResultsDropdown({ onAdd }: { onAdd: () => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (window as any).setSearchResults = setResults;
  }, []);

  if (results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
      {results.map(r => (
        <div key={r.norad_id} className="flex justify-between items-center p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0">
          <div>
            <div className="text-sm font-semibold text-slate-200">{r.name}</div>
            <div className="text-xs text-slate-500 font-mono">NORAD: {r.norad_id}</div>
          </div>
          <button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              fetch(`/api/objects/add?norad_id=${r.norad_id}`, { method: 'POST' })
                .then(() => {
                  setLoading(false);
                  setResults([]);
                  onAdd();
                });
            }}
            className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface TrackedObject {
  norad_id: number;
  name: string;
  type: string;
  size: string;
  lat: number;
  lng: number;
  alt: number;
  tle1: string;
  tle2: string;
}

interface Conjunction {
  id: number;
  object1: { norad_id: number; name: string };
  object2: { norad_id: number; name: string };
  tca_time: string;
  miss_distance_km: number;
  relative_velocity_km_s: number;
  risk_score: number;
}

function App() {
  const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'globe' | 'analysis'>('globe');
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const globeEl = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/conjunctions').then(r => r.json()),
      fetch('/api/objects').then(r => r.json())
    ]).then(([conjData, objData]) => {
      setConjunctions(conjData);
      setObjects(objData);
    }).catch(e => console.error(e));
  }, []);

  const globeData = useMemo(() => {
    const objMap = new Map(objects.map(o => [o.norad_id, o]));
    const arcs: any[] = [];
    const conjunctionRings: any[] = [];
    const conjunctionLabels: any[] = [];
    
    // Compute arcs and rings
    conjunctions.forEach(c => {
      if (!c.object1 || !c.object2) return;
      const o1 = objMap.get(c.object1.norad_id);
      const o2 = objMap.get(c.object2.norad_id);
      if (o1 && o2) {
        arcs.push({
          startLat: o1.lat,
          startLng: o1.lng,
          endLat: o2.lat,
          endLng: o2.lng,
          color: c.risk_score > 0.5 ? 'red' : 'orange',
          risk: c.risk_score
        });

        // Compute actual conjunction point at TCA using satellite.js
        try {
          const satrec = satellite.twoline2satrec(o1.tle1, o1.tle2);
          const tca = new Date(c.tca_time);
          const positionAndVelocity = satellite.propagate(satrec, tca);
          const positionEci = positionAndVelocity.position;
          
          if (typeof positionEci !== 'boolean' && positionEci) {
            const gmst = satellite.gstime(tca);
            const positionGd = satellite.eciToGeodetic(positionEci as any, gmst);
            const tcaLat = satellite.degreesLat(positionGd.latitude);
            const tcaLng = satellite.degreesLong(positionGd.longitude);
            
            conjunctionRings.push({
              lat: tcaLat,
              lng: tcaLng,
              alt: (positionGd.height / 6371) + 0.05 // Slightly above to be visible
            });

            conjunctionLabels.push({
              lat: tcaLat,
              lng: tcaLng,
              alt: (positionGd.height / 6371) + 0.1,
              text: `💥 ALERT\nTime: ${tca.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZoneName:'short'})}\nLat: ${tcaLat.toFixed(2)}°\nLng: ${tcaLng.toFixed(2)}°`,
              size: 0.8,
              color: 'red'
            });
          }
        } catch (e) {
          // ignore propagation errors for rings
        }
      }
    });

    // Compute paths and labels for all tracked objects
    const paths: any[] = [];
    const labels: any[] = [];
    
    objects.forEach(obj => {
      if (!obj.tle1 || !obj.tle2) return;
      
      labels.push({
        lat: obj.lat,
        lng: obj.lng,
        alt: obj.alt / 6371, 
        text: `${obj.name} (${obj.norad_id})\nLat: ${obj.lat.toFixed(2)}°, Lng: ${obj.lng.toFixed(2)}°`,
        size: 0.5,
        color: 'white'
      });
      
      try {
        const satrec = satellite.twoline2satrec(obj.tle1, obj.tle2);
        
        // Find if this object has an upcoming conjunction
        const relatedConj = conjunctions.find(c => c.object1?.norad_id === obj.norad_id || c.object2?.norad_id === obj.norad_id);
        const baseTime = relatedConj ? new Date(relatedConj.tca_time) : new Date();

        // Past path relative to baseTime (-45 mins to 0)
        const pastPoints = [];
        for (let i = -45; i <= 0; i += 2) {
          const t = new Date(baseTime.getTime() + i * 60000);
          const positionAndVelocity = satellite.propagate(satrec, t);
          const positionEci = positionAndVelocity.position;
          if (typeof positionEci !== 'boolean' && positionEci) {
            const gmst = satellite.gstime(t);
            const positionGd = satellite.eciToGeodetic(positionEci as any, gmst);
            pastPoints.push([
              satellite.degreesLat(positionGd.latitude),
              satellite.degreesLong(positionGd.longitude),
              positionGd.height / 6371
            ]);
          }
        }
        if (pastPoints.length > 0) {
          paths.push({ 
            points: pastPoints, 
            color: 'rgba(255, 0, 0, 0.4)', 
            name: obj.name, 
            norad_id: obj.norad_id, 
            type: 'Past Trajectory' 
          });
        }

        // Future path relative to baseTime (0 to +45 mins)
        const futurePoints = [];
        for (let i = 0; i <= 45; i += 2) {
          const t = new Date(baseTime.getTime() + i * 60000);
          const positionAndVelocity = satellite.propagate(satrec, t);
          const positionEci = positionAndVelocity.position;
          if (typeof positionEci !== 'boolean' && positionEci) {
            const gmst = satellite.gstime(t);
            const positionGd = satellite.eciToGeodetic(positionEci as any, gmst);
            futurePoints.push([
              satellite.degreesLat(positionGd.latitude),
              satellite.degreesLong(positionGd.longitude),
              positionGd.height / 6371
            ]);
          }
        }
        if (futurePoints.length > 0) {
          paths.push({ 
            points: futurePoints, 
            color: 'rgba(255, 165, 0, 0.8)', 
            name: obj.name, 
            norad_id: obj.norad_id, 
            type: 'Predicted Trajectory' 
          });
        }
      } catch (e) {
      }
    });

    return { arcs, paths, labels: [...labels, ...conjunctionLabels], conjunctionRings };
  }, [objects, conjunctions]);

  const maxRisk = conjunctions.length > 0 ? Math.max(...conjunctions.map(c => c.risk_score)) : 0;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 rounded-lg shadow-2xl"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-slate-200" /> : <Menu className="w-5 h-5 text-slate-200" />}
      </button>

      {/* Mobile Overlay Backdrop */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-40 md:z-10
        w-[85vw] md:w-[450px] 
        h-full
        bg-slate-900 border-r border-slate-800 flex flex-col shadow-xl shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 pl-10 md:pl-0">
              <Satellite className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
              <h1 className="text-lg md:text-xl font-bold text-slate-100">Orbital Guard</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetch('/api/objects/random', { method: 'POST' })
                  .then(() => window.location.reload());
              }}
              className="flex-1 text-xs bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-400 font-bold px-3 py-2 rounded transition-colors"
            >
              Add 20 Random
            </button>
            <button
              onClick={() => {
                fetch('/api/objects/clear', { method: 'POST' })
                  .then(() => window.location.reload());
              }}
              className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-3 py-2 rounded transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Name or NORAD ID..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              onChange={(e) => {
                const q = e.target.value;
                if (q.length > 2) {
                  fetch(`/api/catalog/search?q=${q}`)
                    .then(r => r.json())
                    .then(data => (window as any).setSearchResults(data));
                } else {
                  (window as any).setSearchResults([]);
                }
              }}
            />
            {/* Search Results Dropdown */}
            <SearchResultsDropdown onAdd={() => window.location.reload()} />
          </div>
          
          <p className="text-xs md:text-sm text-slate-400">Satellite Conjunction Dashboard</p>
        </div>

        {/* Legend */}
        <div className="px-4 md:px-6 pt-3 md:pt-4 pb-2 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1"><Info className="w-3 h-3"/> Map Legend</h3>
          <div className="flex gap-4 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500/80"></div> Past Path
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div> Future Path
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border-2 border-red-500"></div> TCA Alert
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 flex flex-col gap-3 md:gap-4 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-slate-950 p-3 md:p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1 md:mb-2">
                <Satellite className="w-4 h-4" />
                <span className="text-xs uppercase font-semibold tracking-wider">Tracked</span>
              </div>
              <div className="text-xl md:text-2xl font-mono font-bold text-blue-400">{objects.length}</div>
            </div>
            <div className="bg-slate-950 p-3 md:p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-1 md:mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs uppercase font-semibold tracking-wider">Alerts</span>
              </div>
              <div className="text-xl md:text-2xl font-mono font-bold text-rose-500">{conjunctions.length}</div>
            </div>
          </div>
          <div className="bg-slate-950 p-3 md:p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase font-semibold tracking-wider">Max Risk</span>
              </div>
              <div className="text-lg font-mono font-bold text-orange-400">{(maxRisk * 100).toFixed(1)}%</div>
            </div>
            <div className={`w-3 h-3 rounded-full animate-pulse ${maxRisk > 0.5 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500 shadow-[0_0_10px_green]'}`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-6 md:gap-8">
          
          <div>
            <h2 className="text-sm uppercase font-semibold tracking-wider text-slate-500 mb-3 md:mb-4 flex items-center justify-between">
              Upcoming Conjunctions
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">{conjunctions.length}</span>
            </h2>
            <div className="flex flex-col gap-3">
              {conjunctions.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-4 bg-slate-950/50 rounded-lg border border-slate-800/50">No conjunctions detected.</div>
              ) : (
                conjunctions.map(c => (
                  <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 md:p-4 hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start mb-2 md:mb-3">
                      <div className="text-xs md:text-sm font-semibold text-blue-300">
                        {c.object1?.name || 'Unknown'} <span className="text-xs text-slate-500">({c.object1?.norad_id})</span> <br/>
                        <span className="text-slate-500 text-xs">vs</span> <br/>
                        {c.object2?.name || 'Unknown'} <span className="text-xs text-slate-500">({c.object2?.norad_id})</span>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded font-mono font-bold shrink-0 ml-2 ${c.risk_score > 0.5 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                        {(c.risk_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-mono">
                      <div>
                        <div className="text-slate-600 mb-1">TCA (UTC)</div>
                        <div>{new Date(c.tca_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                      <div>
                        <div className="text-slate-600 mb-1">Miss Dist</div>
                        <div>{c.miss_distance_km.toFixed(1)} km</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm uppercase font-semibold tracking-wider text-slate-500 mb-3 md:mb-4 flex items-center justify-between">
              Tracked Objects
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">{objects.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {objects.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-4 bg-slate-950/50 rounded-lg border border-slate-800/50">Search to add objects.</div>
              ) : (
                objects.map(obj => (
                  <button 
                    key={obj.norad_id}
                    onClick={() => {
                      if (globeEl.current) {
                        globeEl.current.pointOfView({ lat: obj.lat, lng: obj.lng, altitude: 2 }, 1000);
                        setSelectedPath({ name: obj.name, norad_id: obj.norad_id, type: 'Current Position' });
                      }
                      setSidebarOpen(false);
                    }}
                    className="flex justify-between items-center text-left bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{obj.name}</div>
                      <div className="text-xs text-slate-500 font-mono">NORAD: {obj.norad_id}</div>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      {obj.alt.toFixed(0)} km
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
        {/* Live Clock Overlay */}
        <div className="absolute bottom-4 right-4 md:bottom-auto md:top-4 md:right-6 z-20 pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-lg px-3 md:px-4 py-2 shadow-2xl flex items-center gap-2">
          <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
          <span className="font-mono text-xs md:text-sm font-semibold text-slate-200">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
          </span>
        </div>

        {/* Top Navigation */}
        <div className="flex justify-center p-4 z-20 absolute top-0 left-0 right-0 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full p-1 flex gap-1 pointer-events-auto shadow-2xl ml-12 md:ml-0">
            <button 
              onClick={() => setActiveTab('globe')}
              className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-colors ${activeTab === 'globe' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Globe View
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-colors ${activeTab === 'analysis' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              Risk Analysis
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'globe' ? (
          <>
            <div className="absolute inset-0 cursor-move">
              <Globe
                ref={globeEl}
                width={windowSize.width < 768 ? windowSize.width : windowSize.width - 450}
                height={windowSize.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                
                // Current positions
                pointsData={objects}
                pointLat="lat"
                pointLng="lng"
                pointAltitude={(d: any) => d.alt / 6371}
                pointRadius={0.05}
                pointColor={() => '#38bdf8'}
                pointResolution={16}
                onPointClick={(obj: any) => setSelectedPath({ name: obj.name, norad_id: obj.norad_id, type: 'Current Position' })}
                onPointHover={(obj) => {
                  if (globeEl.current) globeEl.current.renderer().domElement.style.cursor = obj ? 'pointer' : 'move';
                }}
                
                // Labels
                labelsData={globeData.labels}
                labelLat="lat"
                labelLng="lng"
                labelAltitude="alt"
                labelText="text"
                labelSize="size"
                labelDotRadius={0.1}
                labelColor="color"
                labelResolution={2}
                onLabelClick={(label: any) => {
                  const match = label.text.match(/\((\d+)\)/);
                  if (match) setSelectedPath({ name: label.text.split(' ')[0], norad_id: match[1], type: 'Satellite Label' });
                }}
                onLabelHover={(label) => {
                  if (globeEl.current) globeEl.current.renderer().domElement.style.cursor = label ? 'pointer' : 'move';
                }}

                // Paths
                pathsData={globeData.paths}
                pathPoints="points"
                pathPointLat={p => p[0]}
                pathPointLng={p => p[1]}
                pathPointAlt={p => p[2]}
                pathColor="color"
                pathResolution={2}
                pathStroke={3}
                onPathClick={(path) => setSelectedPath(path)}
                onPathHover={(path) => {
                  if (globeEl.current) {
                    globeEl.current.renderer().domElement.style.cursor = path ? 'pointer' : 'move';
                  }
                }}

                // Connection Arcs
                arcsData={globeData.arcs}
                arcStartLat="startLat"
                arcStartLng="startLng"
                arcEndLat="endLat"
                arcEndLng="endLng"
                arcColor="color"
                arcDashLength={0.5}
                arcDashGap={2}
                arcDashAnimateTime={2000}
                arcAltitude={0.2}

                // Glowing Rings for Conjunction Points
                ringsData={globeData.conjunctionRings}
                ringLat="lat"
                ringLng="lng"
                ringAltitude="alt"
                ringColor={() => '#ef4444'}
                ringMaxRadius={5}
                ringPropagationSpeed={1}
                ringRepeatPeriod={1000}
              />
            </div>

            {selectedPath && (
              <div className="absolute bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:top-20 md:right-6 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl z-20 md:min-w-[250px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                    <Info className="w-3 h-3" /> Trajectory Info
                  </h3>
                  <button onClick={() => setSelectedPath(null)} className="text-slate-500 hover:text-slate-300">×</button>
                </div>
                <div className="text-sm font-semibold text-blue-300 mb-1">
                  {selectedPath.name} <span className="text-xs text-slate-500">({selectedPath.norad_id})</span>
                </div>
                <div className={`text-xs px-2 py-1 inline-block rounded font-mono ${selectedPath.type === 'Past Trajectory' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                  {selectedPath.type}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 md:p-12 md:pt-20">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 md:p-8 rounded-2xl shadow-2xl w-full max-w-5xl h-full max-h-[800px] flex flex-col">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-slate-100">Risk Analysis</h2>
                <p className="text-xs md:text-sm text-slate-400">Miss Distance vs Relative Velocity across all projected conjunctions.</p>
              </div>
              <div className="flex-1 w-full relative">
                {conjunctions.length > 0 ? (
                  <Plot
                    data={[
                      {
                        x: conjunctions.map(c => c.miss_distance_km),
                        y: conjunctions.map(c => c.relative_velocity_km_s),
                        text: conjunctions.map(c => `${c.object1?.name} vs ${c.object2?.name}<br>Risk: ${c.risk_score.toFixed(2)}`),
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                          size: conjunctions.map(c => Math.max(12, c.risk_score * 30)),
                          color: conjunctions.map(c => c.risk_score),
                          colorscale: 'YlOrRd',
                          showscale: true,
                          line: { color: 'rgba(255,255,255,0.2)', width: 1 }
                        },
                        hoverinfo: 'text'
                      }
                    ]}
                    layout={{
                      autosize: true,
                      margin: { l: 60, r: 20, t: 20, b: 60 },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      xaxis: { 
                        title: { text: 'Miss Distance (km)', font: { color: '#cbd5e1', size: 14 } }, 
                        color: '#94a3b8', 
                        gridcolor: '#334155',
                        tickfont: { color: '#94a3b8' } 
                      },
                      yaxis: { 
                        title: { text: 'Relative Velocity (km/s)', font: { color: '#cbd5e1', size: 14 } }, 
                        color: '#94a3b8', 
                        gridcolor: '#334155',
                        tickfont: { color: '#94a3b8' } 
                      },
                      font: { color: '#94a3b8' }
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    No active conjunctions to analyze.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
