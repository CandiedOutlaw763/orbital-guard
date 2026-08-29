'use client'

import { GlobePanel } from './globe-panel'
import { RiskAnalysisPanel } from './risk-analysis-panel'
import { SidePanel } from './side-panel'
import { ViewSwitcher } from './view-switcher'
import { useOrbitalData } from './orbital-context'

export function DashboardMain() {
  const { activeView } = useOrbitalData()

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="relative flex min-h-[70svh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
        <ViewSwitcher />
        {activeView === 'globe' ? <GlobePanel /> : <RiskAnalysisPanel />}
      </div>
      <SidePanel />
    </main>
  )
}
