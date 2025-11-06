import { Link, useLocation } from '@tanstack/react-router'

import { AuroraText, WarpBackground } from '@/components/ui'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Arena', to: '/arena' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

export function AppHeader() {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <WarpBackground className="px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-4 lg:flex-1">
              <Link to="/arena" className="flex items-center gap-3">
                <AuroraText className="text-2xl font-semibold md:text-3xl">
                  AI Arena
                </AuroraText>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  LLM Match Lab
                </span>
              </Link>
            </div>
            <nav
              aria-label="Primary"
              className="flex w-full items-center justify-center gap-3 lg:flex-1"
            >
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
            <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1" />
          </div>

          <div className="flex items-center justify-end gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/60 lg:hidden">
            <span className="font-semibold text-white/70">Arena live</span>
          </div>
        </div>
      </WarpBackground>
    </header>
  )
}
