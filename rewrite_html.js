const fs = require('fs');
let content = fs.readFileSync('frontend/components/globe-viz.tsx', 'utf8');

const replacement = \        htmlElement={(d: any) => {
          const el = document.createElement('div');
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'default';
          
          if (!d.conj) {
            el.innerHTML = \\\
              <div class="relative group">
                <div class="absolute left-0 top-0 w-3 h-3 bg-blue-400 rounded-full animate-ping -translate-x-1.5 -translate-y-1.5"></div>
                <div class="absolute left-0 top-0 w-3 h-3 bg-blue-500 rounded-full border border-white -translate-x-1.5 -translate-y-1.5 shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                <svg class="absolute left-0 top-0 w-16 h-16 pointer-events-none" style="overflow: visible;">
                  <line x1="0" y1="0" x2="64" y2="-64" stroke="rgba(56, 189, 248, 0.5)" stroke-width="1.5" />
                  <circle cx="64" cy="-64" r="2" fill="#38bdf8" />
                </svg>
                <div class="bg-[#0b101a]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md w-[340px] translate-x-[72px] -translate-y-[80px] font-sans overflow-hidden">
                  <div class="flex items-center justify-between p-4 border-b border-white/10">
                    <div class="flex items-center gap-3">
                      <span class="text-blue-400 font-mono text-sm tracking-widest uppercase">NORAD ID: \\\</span>
                      <span class="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">TRACKING</span>
                    </div>
                  </div>
                  <div class="p-4 border-b border-white/10">
                    <div class="text-[#38bdf8] font-mono text-lg truncate">\\\</div>
                    <div class="text-white/50 text-[10px] tracking-widest mt-1 uppercase">\\\</div>
                  </div>
                  <div class="grid grid-cols-2 p-4 gap-y-5 gap-x-4">
                    <div>
                      <div class="text-white font-mono text-base">\\\</div>
                      <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">RCS SIZE</div>
                    </div>
                    <div>
                      <div class="text-white font-mono text-base text-green-400">NOMINAL</div>
                      <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase">STATUS</div>
                    </div>
                  </div>
                </div>
              </div>
            \\\;
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
          
          el.innerHTML = \\\
            <div class="relative group">
              <div class="absolute left-0 top-0 w-4 h-4 bg-red-500 rounded-full animate-ping -translate-x-2 -translate-y-2 opacity-75"></div>
              <div class="absolute left-0 top-0 w-3 h-3 bg-red-600 rounded-full border-2 border-white -translate-x-1.5 -translate-y-1.5 shadow-[0_0_15px_rgba(220,38,38,1)]"></div>
              <svg class="absolute left-0 top-0 w-16 h-16 pointer-events-none" style="overflow: visible;">
                <line x1="0" y1="0" x2="64" y2="-64" stroke="rgba(239, 68, 68, 0.5)" stroke-width="1.5" stroke-dasharray="4" />
                <circle cx="64" cy="-64" r="2" fill="#ef4444" />
              </svg>

              <div class="bg-[#0b101a]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md w-[340px] translate-x-[72px] -translate-y-[80px] font-sans overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-white/10">
                  <div class="flex items-center gap-3">
                    <span class="text-red-500 font-mono text-sm tracking-widest uppercase">CONJUNCTION #\\\</span>
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
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">CLOSEST APPROACH</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">\\\</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase">TCA</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">\\\</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">COLLISION PROB</div>
                  </div>
                  <div>
                    <div class="text-white font-mono text-base">\\\ km/s</div>
                    <div class="text-white/50 text-[10px] tracking-wider mt-1 uppercase truncate">REL VELOCITY</div>
                  </div>
                </div>
              </div>
            </div>
          \\\;
          return el;
        }}\;

const match = content.match(/htmlElement=\\{\\(d: any\\) => \\{[\\s\\S]*?\\n        \\}\\}/);
if (match) {
  content = content.replace(match[0], replacement);
  fs.writeFileSync('frontend/components/globe-viz.tsx', content);
  console.log('Success');
} else {
  console.log('Match not found');
}
