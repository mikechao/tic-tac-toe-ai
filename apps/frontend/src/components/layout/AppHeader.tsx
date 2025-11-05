import { useEffect, useMemo, useState } from 'react'

import { Link, useLocation } from '@tanstack/react-router'

import {
  AuroraText,
  Marquee,
  NumberTicker,
  RainbowButton,
  WarpBackground,
} from '@/components/ui'
import { demoLeaderboardHighlights } from '@/data/demo.leaderboard'
import { demoMatches } from '@/data/demo.matches'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Arena', to: '/arena' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

const storageKey = 'ai-arena:reduced-motion'

export function AppHeader() {
  const location = useLocation()
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(storageKey)
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsReducedMotion((current) => {
        const stored = window.localStorage.getItem(storageKey)
        if (stored !== null) return stored === 'true'
        return event.matches
      })
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.reducedMotion = String(isReducedMotion)
    window.localStorage.setItem(storageKey, String(isReducedMotion))
  }, [isReducedMotion])

  const featuredMatch = demoMatches.matches[0]
  const currentGame = 4
  const gameProgressLabel = `${currentGame}/${featuredMatch.totalRounds}`

  const highlights = useMemo(
    () => (isReducedMotion ? demoLeaderboardHighlights.slice(0, 2) : demoLeaderboardHighlights),
    [isReducedMotion],
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <WarpBackground className="px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link to="/arena" className="flex items-center gap-3">
                <AuroraText className="text-2xl font-semibold md:text-3xl">
                  AI Arena
                </AuroraText>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  LLM Match Lab
                </span>
              </Link>
              <span className="hidden h-5 w-px bg-white/20 lg:block" aria-hidden="true" />
              <div className="hidden items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 lg:flex">
                <span>Series</span>
                <NumberTicker value={currentGame} className="text-white" />
                <span className="text-white/40">of</span>
                <NumberTicker value={featuredMatch.totalRounds} className="text-white" />
              </div>
            </div>
            <nav aria-label="Primary" className="flex items-center gap-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
                      isActive
                        ? 'border-[#4ff2c2]/60 bg-[#4ff2c2]/20 text-white shadow-[0_0_24px_rgba(79,242,194,0.25)]'
                        : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsReducedMotion((state) => !state)}
                className={cn(
                  'hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition lg:flex',
                  isReducedMotion
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-white/5 text-white/70 hover:text-white',
                )}
                aria-pressed={isReducedMotion}
              >
                <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                {isReducedMotion ? 'Reduced motion' : 'Full motion'}
              </button>
              <RainbowButton
                asChild
                className="uppercase tracking-[0.3em]"
              >
                <Link to="/arena">Start New Match</Link>
              </RainbowButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60 lg:hidden">
            <span>Series</span>
            <span className="text-white">
              {gameProgressLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsReducedMotion((state) => !state)}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold text-white/70"
            >
              {isReducedMotion ? 'Reduced motion' : 'Full motion'}
            </button>
          </div>

          <Marquee
            className="rounded-[1.5rem] border border-white/10 bg-white/5 px-0 py-0 text-xs uppercase tracking-[0.25em] text-white/70"
            pauseOnHover
            repeat={6}
          >
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white/80"
              >
                {item}
              </span>
            ))}
          </Marquee>
        </div>
      </WarpBackground>
    </header>
  )
}
