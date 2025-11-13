import { Link, useLocation } from '@tanstack/react-router'
import { SiGithub } from "react-icons/si";

import { AuroraText, WarpBackground } from '@/components/ui'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { MenuFluid } from '@/components/ui'

const navItems = [
  { label: 'Arena', to: '/arena' },
  { label: 'Models', to: '/models' },
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
                  Browser AI Arena
                </AuroraText>
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  SLM Match Lab
                </span>
              </Link>
            </div>
            <nav
              aria-label="Primary"
              className="flex w-full items-center justify-center gap-3 lg:flex-1"
            >
              <MenuFluid
                menuItems={navItems}
                currentPath={location.pathname}
                indicatorClassName="bg-[#4ff2c2]/30 border border-[#4ff2c2]/40 shadow-[0_0_24px_rgba(79,242,194,0.35)]"
              />
            </nav>
            <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
              <RainbowButton asChild size="icon" variant="default">
                <a
                  href="https://github.com/mikechao/tic-tac-toe-ai"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Visit Mike Chao on GitHub"
                >
                  <SiGithub className="h-8 w-8" aria-hidden="true" />
                </a>
              </RainbowButton>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.3em] text-white/60 lg:hidden">
            <span className="font-semibold text-white/70">Arena live</span>
          </div>
        </div>
      </WarpBackground>
    </header>
  )
}
