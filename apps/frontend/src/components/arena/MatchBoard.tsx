import { useMemo } from 'react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { MyMagicCard, NumberTicker, StateMessage } from '@/components/ui'
import { useGameLoop } from '@/integrations/game-loop/context'

type MatchSummary = MatchListResponse['matches'][number]

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E']

const actorToMark: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

function formatCellLabel(row: number, column: number): string {
  const rowLabel = ROW_LABELS[row] ?? `R${row + 1}`
  return `${rowLabel}${column + 1}`
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
          label: formatCellLabel(rowIndex, columnIndex),
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
                name={modelA?.name ?? 'Model A'}
                variant={modelA?.variant ?? 'On-device prototype'}
                mark="X"
                accentClass="bg-[#4ff2c2]/30 border border-[#4ff2c2]/50"
                isActive={activeMark === 'X'}
              />
              <PlayerBadge
                name={modelB?.name ?? 'Model B'}
                variant={modelB?.variant ?? 'Experimental release'}
                mark="O"
                accentClass="bg-[#f15bb5]/25 border border-[#f15bb5]/45"
                isActive={activeMark === 'O'}
              />
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs uppercase tracking-[0.2em] text-white/60">
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">X wins</span>
                <NumberTicker
                  value={scoreboard.modelA}
                  className="text-base font-semibold text-white"
                />
              </div>
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">O wins</span>
                <NumberTicker
                  value={scoreboard.modelB}
                  className="text-base font-semibold text-white"
                />
              </div>
              <div className="flex items-center justify-between gap-6 text-sm tracking-[0.15em]">
                <span className="text-white/60">Ties</span>
                <NumberTicker
                  value={scoreboard.ties}
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
