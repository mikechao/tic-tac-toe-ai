import { useMemo } from 'react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { MagicCard, NumberTicker, StateMessage } from '@/components/ui'

type MatchSummary = MatchListResponse['matches'][number]

type BoardCell = {
  id: string
  label: string
  position: string
  mark: 'X' | 'O' | null
  isWinning?: boolean
}

const demoBoardState: BoardCell[] = [
  {
    id: 'cell-0',
    label: 'A1',
    position: 'Top left',
    mark: 'X',
    isWinning: true,
  },
  { id: 'cell-1', label: 'A2', position: 'Top center', mark: 'O' },
  { id: 'cell-2', label: 'A3', position: 'Top right', mark: 'X' },
  { id: 'cell-3', label: 'B1', position: 'Middle left', mark: 'O' },
  { id: 'cell-4', label: 'B2', position: 'Center', mark: 'X', isWinning: true },
  { id: 'cell-5', label: 'B3', position: 'Middle right', mark: null },
  { id: 'cell-6', label: 'C1', position: 'Bottom left', mark: null },
  { id: 'cell-7', label: 'C2', position: 'Bottom center', mark: 'O' },
  {
    id: 'cell-8',
    label: 'C3',
    position: 'Bottom right',
    mark: 'X',
    isWinning: true,
  },
]

const demoScore = {
  modelAWins: 2,
  modelBWins: 1,
  ties: 1,
  currentRound: 4,
}

function PlayerBadge({
  name,
  variant,
  mark,
  accentClass,
  isActive,
}: {
  name: string
  variant: string
  mark: 'X' | 'O'
  accentClass: string
  isActive?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition',
        isActive
          ? 'border-[#4ff2c2]/50 shadow-[0_0_36px_rgba(79,242,194,0.35)]'
          : 'border-white/10',
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-xl text-2xl font-semibold text-white shadow-[0_8px_24px_rgba(11,16,38,0.55)]',
          accentClass,
        )}
        aria-hidden="true"
      >
        {mark}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="text-xs text-white/60">{variant}</span>
      </div>
    </div>
  )
}

export function MatchBoard({ match }: { match?: MatchSummary }) {
  const modelAId = match?.modelAId
  const modelBId = match?.modelBId

  const modelA = useMemo(() => {
    if (modelAId == null) return undefined
    return demoModels.find((model) => model.id === modelAId)
  }, [modelAId])

  const modelB = useMemo(() => {
    if (modelBId == null) return undefined
    return demoModels.find((model) => model.id === modelBId)
  }, [modelBId])

  if (!match) {
    return (
      <div className="flex h-full items-center justify-center">
        <StateMessage
          title="No active match"
          description="Queue a new showdown to populate the arena board. Once a match is running, the grid will animate with live moves."
          action={
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">
              Start a match from the controls
            </span>
          }
        />
      </div>
    )
  }

  const boardStatus = `Round ${demoScore.currentRound} of ${match.totalRounds}`
  const turnsRemaining =
    match.totalRounds - demoScore.currentRound >= 0
      ? match.totalRounds - demoScore.currentRound
      : 0

  return (
    <div className="flex flex-col gap-6 text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Match Arena Board
        </p>
        <h2 className="font-display text-3xl font-semibold">
          {modelA?.name ?? 'Model A'} vs {modelB?.name ?? 'Model B'}
        </h2>
      </header>

      <MagicCard className="border-white/15 bg-white/[0.04]" spotlight={false}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <PlayerBadge
                name={modelA?.name ?? 'Model A'}
                variant={modelA?.variant ?? 'On-device prototype'}
                mark="X"
                accentClass="bg-[#4ff2c2]/30 border border-[#4ff2c2]/50"
                isActive={false}
              />
              <PlayerBadge
                name={modelB?.name ?? 'Model B'}
                variant={modelB?.variant ?? 'Experimental release'}
                mark="O"
                accentClass="bg-[#f15bb5]/25 border border-[#f15bb5]/45"
                isActive
              />
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-white/60">
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">X wins</span>
                <NumberTicker
                  value={demoScore.modelAWins}
                  className="text-base font-semibold text-white"
                />
              </div>
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">O wins</span>
                <NumberTicker
                  value={demoScore.modelBWins}
                  className="text-base font-semibold text-white"
                />
              </div>
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">Ties</span>
                <NumberTicker
                  value={demoScore.ties}
                  className="text-base font-semibold text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
              <span>{boardStatus}</span>
              <span aria-live="polite">
                {turnsRemaining === 0
                  ? 'Final round underway'
                  : `${turnsRemaining} ${
                      turnsRemaining === 1 ? 'round' : 'rounds'
                    } remaining`}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4ff2c2] via-[#f15bb5] to-[#ffb547]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      (demoScore.currentRound / match.totalRounds) * 100,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>

          <table
            aria-label="Tic tac toe match board"
            className="w-full border-separate border-spacing-3 sm:border-spacing-4"
          >
            <tbody>
              {[0, 1, 2].map((rowIndex) => (
                <tr
                  key={demoBoardState[rowIndex * 3]?.id ?? `row-${rowIndex}`}
                  className="align-middle"
                >
                  {demoBoardState
                    .slice(rowIndex * 3, rowIndex * 3 + 3)
                    .map((cell) => (
                      <td
                        key={cell.id}
                        aria-label={`${cell.position} ${
                          cell.mark ? `contains ${cell.mark}` : 'is empty'
                        }`}
                        className={cn(
                          'relative h-24 min-w-[6rem] rounded-[1.25rem] border border-white/12 bg-white/5 text-center text-3xl font-semibold uppercase transition sm:h-28 sm:text-4xl lg:h-32',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--muted-surface)]',
                        cell.isWinning
                          ? 'border-[#4ff2c2] bg-[#4ff2c2]/15 shadow-[0_0_32px_rgba(79,242,194,0.35)]'
                          : 'hover:border-white/25 hover:bg-white/10',
                      )}
                    >
                      <span className="absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                        {cell.label}
                      </span>
                      <span
                        className={cn(
                          'transition-transform duration-300',
                          cell.mark
                            ? 'scale-100 text-white'
                            : 'scale-90 text-white/30',
                        )}
                      >
                        {cell.mark ?? '·'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold uppercase tracking-[0.2em] text-white/60">
              Active turn
            </span>
            <p className="text-base text-white">
              {modelB?.name ?? 'Model B'} analysing center lane response…
            </p>
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              Thinking window 12s
            </span>
          </div>
        </div>
      </MagicCard>
    </div>
  )
}
