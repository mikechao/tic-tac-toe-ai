import { NumberTicker } from '@/components/ui'
import { cn } from '@/lib/utils'

const streakLabel: Record<'win' | 'loss' | 'tie', string> = {
  win: 'Win streak',
  loss: 'Loss streak',
  tie: 'Tie streak',
}

const resultColor: Record<'W' | 'L' | 'T', string> = {
  W: 'bg-[#4ff2c2]/20 text-[#4ff2c2]',
  L: 'bg-[#f15bb5]/25 text-[#f15bb5]',
  T: 'bg-[#ffb547]/20 text-[#ffb547]',
}

export type RecentResult = 'W' | 'L' | 'T'

export interface ModelLeaderBoardStatsProps {
  wins: number
  losses: number
  ties: number
  winRate: number
  streakType: 'win' | 'loss' | 'tie'
  streakLength: number
  averageTurns: number
  lastMatchup?: {
    opponentName: string
    result: 'W' | 'L' | 'T'
    playedAt: string
  }
  recentForm: RecentResult[]
  className?: string
}

function MiniStat({
  label,
  value,
  emphasis = 'text-white',
  prefix,
  suffix,
  decimalPlaces,
}: {
  label: string
  value: number
  emphasis?: string
  prefix?: string
  suffix?: string
  decimalPlaces?: number
}) {
  return (
    <div className="w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        {label}
      </p>
      <div className="mt-1 flex items-end gap-1">
        {prefix ? (
          <span className="pb-1 text-sm font-semibold text-white/60">
            {prefix}
          </span>
        ) : null}
        <NumberTicker
          value={value}
          decimalPlaces={decimalPlaces}
          className={`text-lg font-semibold ${emphasis}`}
        />
        {suffix ? (
          <span className="pb-1 text-sm font-semibold text-white/60">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function MatchupStat({
  opponentName,
  result,
  playedAt,
  className,
}: {
  opponentName: string
  result: 'W' | 'L' | 'T'
  playedAt: string
  className?: string
}) {
  return (
    <div className={`w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-2 ${className || ''}`}>
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        Last matchup
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-xs font-semibold flex-shrink-0',
            resultColor[result],
          )}
        >
          {result}
        </span>
        <span className="text-sm font-semibold text-white truncate flex-shrink">
          {opponentName}
        </span>
        <span className="text-xs text-white/60 flex-shrink-0">
          {new Date(playedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

function RecentFormStat({
  recentForm,
}: {
  recentForm: RecentResult[]
}) {
  return (
    <div className="w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">
        Last 5 Games
      </p>
      <div className="mt-2 flex gap-2">
        {recentForm.map((result, index) => (
          <span
            key={index}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-xs font-semibold',
              resultColor[result],
            )}
          >
            {result}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ModelLeaderBoardStats({
  wins,
  losses,
  ties,
  winRate,
  streakType,
  streakLength,
  averageTurns,
  lastMatchup,
  recentForm,
  className,
}: ModelLeaderBoardStatsProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 w-full ${className || ''}`}>
      <MiniStat label="Wins" value={wins} emphasis="text-[#4ff2c2]" />
      <MiniStat label="Losses" value={losses} emphasis="text-[#f15bb5]" />
      <MiniStat label="Ties" value={ties} emphasis="text-[#ffb547]" />
      <MiniStat
        label="Win Rate"
        value={winRate * 100}
        suffix="%"
        decimalPlaces={1}
      />
      <MiniStat
        label={streakLabel[streakType]}
        value={streakLength}
        prefix="×"
      />
      <MiniStat
        label="Avg turns"
        value={averageTurns}
        decimalPlaces={1}
      />
      {lastMatchup ? (
        <MatchupStat
          opponentName={lastMatchup.opponentName}
          result={lastMatchup.result}
          playedAt={lastMatchup.playedAt}
          className="col-span-2"
        />
      ) : (
        <div className="col-span-2 text-center text-white/40 text-sm">
          No previous matchups
        </div>
      )}
      <RecentFormStat recentForm={recentForm} />
    </div>
  )
}