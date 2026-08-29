'use client'

import { ChevronLeft } from 'lucide-react'
import { useRef, type SyntheticEvent } from 'react'
import { GlobePanel } from './globe-panel'
import { RiskAnalysisPanel } from './risk-analysis-panel'
import { SidePanel } from './side-panel'
import { ViewSwitcher } from './view-switcher'
import { useOrbitalData } from './orbital-context'
import { cn } from '@/lib/utils'
import { isFinePointerDevice, isSidebarDismissIgnored } from '@/lib/sidebar-interaction'

export function DashboardMain() {
  const { activeView, sidebarOpen, setSidebarOpen } = useOrbitalData()
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const closeFromWorkspace = (event: SyntheticEvent, mode: 'click' | 'dblclick') => {
    if (!sidebarOpen) return
    if (isSidebarDismissIgnored(event.target)) return
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) return
    const fine = isFinePointerDevice()
    if (mode === 'dblclick' && !fine) return
    if (mode === 'click' && fine) return
    setSidebarOpen(false)
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div
        className="relative flex min-h-[70svh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0"
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY }
        }}
        onClick={(event) => {
          const start = pointerStart.current
          pointerStart.current = null
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
          ) {
            return
          }
          closeFromWorkspace(event, 'click')
        }}
        onDoubleClick={(event) => closeFromWorkspace(event, 'dblclick')}
      >
        <ViewSwitcher />
        {activeView === 'globe' ? <GlobePanel /> : <RiskAnalysisPanel />}
        <button
          type="button"
          data-sidebar-chrome
          aria-label="Open conjunction alerts"
          onClick={() => setSidebarOpen(true)}
          className={cn(
            'absolute top-1/2 right-0 z-30 flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-panel/95 text-muted-foreground backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground',
            sidebarOpen
              ? 'pointer-events-none translate-x-2 opacity-0'
              : 'translate-x-0 opacity-100',
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close conjunction alerts"
          className="absolute inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'z-40 min-h-0 shrink-0 overflow-hidden bg-background',
          'transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'motion-reduce:transition-none',
          'max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:h-full max-lg:w-[min(22rem,100vw)] max-lg:border-l max-lg:border-border',
          sidebarOpen ? 'max-lg:translate-x-0' : 'pointer-events-none max-lg:translate-x-full',
          sidebarOpen ? 'lg:w-[22rem] xl:w-[24rem]' : 'lg:w-0',
        )}
      >
        <div className="flex h-full w-[min(22rem,100vw)] lg:w-[22rem] xl:w-[24rem]">
          <SidePanel />
        </div>
      </div>
    </main>
  )
}
