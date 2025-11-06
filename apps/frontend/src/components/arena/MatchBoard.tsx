import { useMemo } from 'react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { MyMagicCard, NumberTicker, StateMessage } from '@/components/ui'
import { MagicCard } from '@/components/ui/magic-card'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useGameLoop } from '@/integrations/game-loop/context'

type MatchSummary = MatchListResponse['matches'][number]

const actorToMark: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

function formatCellLabel(row: number, column: number, boardSize: number): string {
  const index = row * boardSize + column + 1
  return String(index)
}

function getActiveTurnText(
  phase: string,
  playerName?: string,
): string {
  if (phase === 'running' && playerName) {
    return `${playerName} analysing next response...`
  }
  if (phase === 'initializing') {
    return 'Preparing models for the opening move...'
  }
  if (phase === 'betweenRounds') {
    return 'Intermission between rounds — queue the next showdown.'
  }
  if (phase === 'completed') {
    return 'Match completed — configure a rematch to continue.'
  }
  return 'Awaiting match configuration.'
}

function PlayerBadge({
  title,
  name,
  variant,
  mark,
  accentClass,
  isActive,
  stats,
}: {
  title: string
  name: string
  variant: string
  mark: 'X' | 'O'
  accentClass: string
  isActive?: boolean
  stats?: { wins: number; losses: number; ties: number }
}) {
  const gradientFrom = mark === 'X' ? '#4ff2c2' : '#f15bb5'
  const gradientTo = mark === 'X' ? 'rgba(79,242,194,0.35)' : 'rgba(241,91,181,0.35)'
  const gradientColor = mark === 'X' ? '#16382f' : '#3c1428'

  const wins = stats?.wins ?? 0
  const losses = stats?.losses ?? 0
  const ties = stats?.ties ?? 0

  return (
    <Card className="border-none bg-transparent p-0 shadow-none">
      <MagicCard
        gradientColor={gradientColor}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        className={cn(
          'rounded-2xl border border-white/10 bg-white/5 text-white transition',
          isActive
            ? 'border-[#4ff2c2]/50 shadow-[0_0_36px_rgba(79,242,194,0.35)]'
            : 'border-white/10',
        )}
      >
        <CardHeader className="border-b border-white/10 px-5 pt-3 !pb-2">
          <CardTitle className="text-xs uppercase tracking-[0.3em] text-white/60">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-3">
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
              <span className="text-base font-semibold text-white">{name}</span>
              <span className="text-xs text-white/60">{variant}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-white/10 px-5 pt-0 pb-3 text-[10px] uppercase tracking-[0.25em] text-white/50">
          <div className="flex flex-wrap gap-4">
            <StatTicker label="Wins" value={wins} />
            <StatTicker label="Losses" value={losses} />
            <StatTicker label="Ties" value={ties} />
          </div>
        </CardFooter>
      </MagicCard>
    </Card>
  )
}

function StatTicker({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1">
      {label}:
      <NumberTicker value={value} className="text-white" duration={0.7} />
    </span>
  )
}

export function MatchBoard({ match }: { match?: MatchSummary }) {
  const { state } = useGameLoop()
  const board = state.board
  const boardSize = board.size

  const modelAId = state.modelAId ?? match?.modelAId ?? null
  const modelBId = state.modelBId ?? match?.modelBId ?? null

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

  const totalRounds = state.totalRounds || match.totalRounds
  const boardStatus = `Round ${Math.max(state.currentRound, 1)} of ${totalRounds}`
  const turnsRemaining = Math.max(
    0,
    totalRounds - state.currentRound,
  )
  const boardRows = useMemo(() => {
    const boardCells = board.getCells()
    return Array.from({ length: boardSize }, (_, rowIndex) =>
      Array.from({ length: boardSize }, (_, columnIndex) => {
        const index = rowIndex * boardSize + columnIndex
        return {
          id: `cell-${index}`,
          label: formatCellLabel(rowIndex, columnIndex, boardSize),
          mark: boardCells[index],
        }
      }),
    )
  }, [board, boardSize])

  const scoreboard = state.score
  const progressPercent =
    totalRounds > 0
      ? Math.min(100, (state.currentRound / totalRounds) * 100)
      : 0
  const activePlayerName =
    state.activePlayer === 'modelA'
      ? modelA?.name ?? 'Model A'
      : state.activePlayer === 'modelB'
        ? modelB?.name ?? 'Model B'
        : undefined
  const activeMark = state.activePlayer
    ? actorToMark[state.activePlayer]
    : null
  const activeTurnText = getActiveTurnText(state.phase, activePlayerName)

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

      <MyMagicCard className="border-white/15 bg-white/[0.04]" spotlight={false}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <PlayerBadge
                title="Player 1"
                name={modelA?.name ?? 'Model A'}
                variant={modelA?.variant ?? 'On-device prototype'}
                mark="X"
                accentClass="bg-[#4ff2c2]/30 border border-[#4ff2c2]/50"
                isActive={activeMark === 'X'}
                stats={{
                  wins: scoreboard.modelA,
                  losses: scoreboard.modelB,
                  ties: scoreboard.ties,
                }}
              />
              <PlayerBadge
                title="Player 2"
                name={modelB?.name ?? 'Model B'}
                variant={modelB?.variant ?? 'Experimental release'}
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
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          <table
            aria-label="Tic tac toe match board"
            className="w-full border-separate border-spacing-3 sm:border-spacing-4"
          >
            <tbody>
              {boardRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="align-middle">
                  {row.map((cell) => (
                    <td
                      key={cell.id}
                      aria-label={`${cell.label} ${
                        cell.mark ? `contains ${cell.mark}` : 'is empty'
                      }`}
                      className={cn(
                        'relative h-24 min-w-[6rem] rounded-[1.25rem] border border-white/12 bg-white/5 text-center text-3xl font-semibold uppercase transition sm:h-28 sm:text-4xl lg:h-32',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--muted-surface)]',
                        'hover:border-white/25 hover:bg-white/10',
                      )}
                    >
                  <span className="absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                    {cell.label}
                  </span>
                  <span
                    className={cn(
                      'text-4xl font-semibold transition-transform duration-300 sm:text-5xl',
                      cell.mark ? 'scale-100' : 'scale-90 text-white/30',
                      cell.mark === 'X' && 'text-[#4ff2c2]',
                      cell.mark === 'O' && 'text-[#f15bb5]',
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
              {activeTurnText}
            </p>
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              {state.phase === 'running'
                ? state.activePlayer
                  ? `${actorToMark[state.activePlayer]} thinking`
                  : 'Engine live'
                : 'Awaiting action'}
            </span>
          </div>
        </div>
      </MyMagicCard>
    </div>
  )
}
