'use client'

import { Bell, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useOrbitalData } from './orbital-context'

function useLocalClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

function formatTime(date: Date | null) {
  if (!date) return '--:--:--'
  return date.toLocaleTimeString(undefined, { hour12: false })
}

function formatDate(date: Date | null) {
  if (!date) return '--- ----'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function AppHeader() {
  const now = useLocalClock()
  const inputRef = useRef<HTMLInputElement>(null)
  const { conjunctions, refreshData } = useOrbitalData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const highRiskCount = conjunctions.filter(c => c.risk_score > 7).length

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && document.activeElement !== inputRef.current) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true)
        fetch(`/api/catalog/search?q=${encodeURIComponent(searchQuery)}`)
          .then(r => r.json())
          .then(data => {
            setSearchResults(Array.isArray(data) ? data : [])
            setShowDropdown(true)
          })
          .finally(() => setIsSearching(false))
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const handleAddObject = (noradId: number) => {
    fetch(`/api/objects/add?norad_id=${noradId}`, { method: 'POST' })
      .then(() => {
        refreshData()
        setSearchQuery('')
        setShowDropdown(false)
      })
  }

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-border bg-background px-4 py-3 lg:flex-nowrap lg:px-6">
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

      <div className="order-3 w-full lg:order-none lg:mx-auto lg:max-w-2xl lg:flex-1 relative">
        <form
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <label className="sr-only" htmlFor="object-search">
            Search satellite, debris or NORAD ID
          </label>
          <div className="flex items-center gap-3 rounded-lg border border-input bg-panel px-3 py-2.5 focus-within:border-primary/60 relative">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id="object-search"
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search satellite, debris or NORAD ID..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 rounded border border-input px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
              /
            </kbd>
          </div>
        </form>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-panel border border-border rounded-lg shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map(r => (
              <button
                key={r.norad_id}
                type="button"
                onClick={() => handleAddObject(r.norad_id)}
                className="w-full flex justify-between items-center p-3 hover:bg-input border-b border-border last:border-0 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">NORAD: {r.norad_id}</div>
                </div>
                <span className="text-xs text-primary font-medium">Add to Globe +</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="text-right leading-tight">
          <p className="font-mono text-base tabular-nums">
            {formatTime(now)} <span className="text-muted-foreground">LOCAL</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{formatDate(now)}</p>
        </div>

        <button
          type="button"
          className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-panel hover:text-foreground"
          aria-label={`${highRiskCount} unread notifications`}
        >
          <Bell className="size-5" aria-hidden="true" />
          {highRiskCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-foreground">
              {highRiskCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full border border-input text-xs font-semibold tracking-wider text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          aria-label="Account menu for operator OG"
        >
          OG
        </button>
      </div>
    </header>
  )
}
