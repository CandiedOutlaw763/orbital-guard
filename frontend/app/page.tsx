import { AppHeader } from '@/components/app-header'
import { DashboardMain } from '@/components/dashboard-main'
import { OrbitalProvider } from '@/components/orbital-context'

export default function Page() {
  return (
    <OrbitalProvider>
      <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background font-sans">
        <AppHeader />
        <DashboardMain />
      </div>
    </OrbitalProvider>
  )
}
