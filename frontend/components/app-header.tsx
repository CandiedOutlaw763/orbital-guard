'use client'

import { useEffect, useState } from 'react'

function useLocalClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

export function AppHeader() {
  const now = useLocalClock()

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/12">
          <img
            src="/images/orbital-guard-logo.png"
            alt="Orbital Guard"
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">Orbital Guard</h1>
          <p className="truncate text-[11px] tracking-[0.18em] text-muted-foreground">
            SPACE SITUATIONAL AWARENESS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="hidden items-center gap-3 sm:flex">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">Live Data</p>
            <p className="text-[11px] text-muted-foreground">ISRO / MCF</p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="font-mono text-base tabular-nums">
            {now
              ? now.toLocaleTimeString('en-GB', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'UTC',
                })
              : '--:--:--'}{' '}
            <span className="text-muted-foreground">UTC</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {now
              ? now.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
              : '--- ----'}
          </p>
        </div>
      </div>
    </header>
  )
}
