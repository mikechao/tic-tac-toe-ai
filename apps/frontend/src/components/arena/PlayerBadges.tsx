import { useMemo } from 'react'

import { localAIModels } from '@/data/models'
import { cn } from '@/lib/utils'
import { MarkAvatar, MagicCard, NumberTicker } from '@/components/ui'
import { useGameLoop } from '@/integrations/game-loop/context'

function StatTicker({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1">
      {label}:
      <NumberTicker value={value} className="text-white" duration={0.7} />
    </span>
  )
}

function PlayerBadge({
  title,
  model,
  mark,
  accentClass,
  isActive,
  stats,
}: {
  title: string
  model?: (typeof localAIModels)[number]
  mark: 'X' | 'O'
  accentClass?: string
  isActive?: boolean
  stats?: { wins: number; losses: number; ties: number }
}) {
  const gradientFrom = mark === 'X' ? '#4ff2c2' : '#f15bb5'
  const gradientTo = mark === 'X' ? 'rgba(79,242,194,0.35)' : 'rgba(241,91,181,0.35)'
  const gradientColor = mark === 'X' ? '#16382f' : '#3c1428'

  // Active glow colors - mint for X, magenta for O
  const activeBorderColor = mark === 'X' ? 'border-[#4ff2c2]/50' : 'border-[#f15bb5]/50'
  const activeShadowColor = mark === 'X'
    ? 'shadow-[0_0_36px_rgba(79,242,194,0.35)] animate-pulse-glow'
    : 'shadow-[0_0_36px_rgba(241,91,181,0.35)] animate-pulse-glow'

  const wins = stats?.wins ?? 0
  const losses = stats?.losses ?? 0
  const ties = stats?.ties ?? 0
  const name = model?.name ?? 'Model'
  const variant = model?.variant ?? 'On-device variant'

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 text-white">
      <MagicCard
        gradientColor={gradientColor}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        className={cn(
          'rounded-2xl border border-white/10 bg-white/5 text-white transition',
          accentClass,
          isActive
            ? `${activeBorderColor} ${activeShadowColor}`
            : 'border-white/10',
        )}
      >
        <div className="flex flex-row items-center justify-between border-b border-white/10 px-4 pt-3 pb-2">
          <MarkAvatar mark={mark} className="size-7" />
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            {title}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white">{name}</span>
            <span className="text-xs text-white/60">{variant}</span>
            </div>
        </div>
        <div className="border-t border-white/10 px-4 pt-1! pb-2 text-[10px] uppercase tracking-[0.25em] text-white/50">
          <div className="flex flex-wrap gap-3">
            <StatTicker label="Wins" value={wins} />
            <StatTicker label="Losses" value={losses} />
            <StatTicker label="Ties" value={ties} />
          </div>
        </div>
      </MagicCard>
    </div>
  )
}

export function PlayerBadges() {
  const { state } = useGameLoop()

  const modelAId = state.modelAId
  const modelBId = state.modelBId

  const modelA = useMemo(() => {
    if (modelAId == null) return undefined
    return localAIModels.find((model) => model.id === modelAId)
  }, [modelAId])

  const modelB = useMemo(() => {
    if (modelBId == null) return undefined
    return localAIModels.find((model) => model.id === modelBId)
  }, [modelBId])

  const activeMark = state.activePlayer
    ? (state.activePlayer === 'modelA' ? 'X' : 'O')
    : null

  const scoreboard = state.score

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row gap-5">
        <div className="flex-1">
          <PlayerBadge
            title="Player 1"
            model={modelA}
            mark="X"
            accentClass="bg-[#4ff2c2]/30 border border-[#4ff2c2]/50"
            isActive={activeMark === 'X'}
            stats={{
              wins: scoreboard.modelA,
              losses: scoreboard.modelB,
              ties: scoreboard.ties,
            }}
          />
        </div>
        <div className="flex-1">
          <PlayerBadge
            title="Player 2"
            model={modelB}
            mark="O"
            accentClass="bg-[#f15bb5]/25 border border-[#f15bb5]/45"
            isActive={activeMark === 'O'}
            stats={{
              wins: scoreboard.modelB,
              losses: scoreboard.modelA,
              ties: scoreboard.ties,
            }}
          />
        </div>
      </div>
    </div>
  )
}
