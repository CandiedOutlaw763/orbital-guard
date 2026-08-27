import { AppHeader } from '@/components/app-header'
import { GlobePanel } from '@/components/globe-panel'
import { SidePanel } from '@/components/side-panel'
import { OrbitalProvider } from '@/components/orbital-context'

export default function Page() {
  return (
    <OrbitalProvider>
      <div className="flex min-h-svh flex-col bg-background font-sans lg:h-svh lg:overflow-hidden">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <GlobePanel />
          <SidePanel />
        </main>
      </div>
    </OrbitalProvider>
  )
}
