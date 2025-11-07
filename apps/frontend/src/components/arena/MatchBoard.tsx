import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import type { BoardState, PlayerMark } from '@/lib/game/board-state'
import { cn } from '@/lib/utils'
import { MarkAvatar, MyMagicCard, NumberTicker, RainbowButton, StateMessage } from '@/components/ui'
import { MagicCard } from '@/components/ui/magic-card'
import { useConfetti } from '@/components/ui/confetti'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MatchMoveLog } from '@/components/arena/MatchMoveLog'
import { useGameLoop } from '@/integrations/game-loop/context'
import type { MatchConfig } from '@/lib/game/game-loop'

type MatchSummary = MatchListResponse['matches'][number]

const actorToMark: Record<'modelA' | 'modelB', 'X' | 'O'> = {
  modelA: 'X',
  modelB: 'O',
}

type WinningLine = {
  mark: PlayerMark
  indices: number[]
}

function findWinningLine(board: BoardState): WinningLine | null {
  const size = board.size
  const cells = board.getCells()

  const evaluate = (indices: number[]): WinningLine | null => {
    const first = cells[indices[0]]
    if (first == null) {
      return null
    }
    for (let idx = 1; idx < indices.length; idx += 1) {
      if (cells[indices[idx]] !== first) {
        return null
      }
    }
    return { mark: first, indices }
  }

  for (let row = 0; row < size; row += 1) {
    const indices = Array.from(
      { length: size },
      (_, column) => row * size + column,
    )
    const result = evaluate(indices)
    if (result) {
      return result
    }
  }

  for (let column = 0; column < size; column += 1) {
    const indices = Array.from(
      { length: size },
      (_, row) => row * size + column,
    )
    const result = evaluate(indices)
    if (result) {
      return result
    }
  }

  const primaryDiagonal = Array.from(
    { length: size },
    (_, index) => index * size + index,
  )
  const secondaryDiagonal = Array.from(
    { length: size },
    (_, index) => index * size + (size - 1 - index),
  )

  return evaluate(primaryDiagonal) ?? evaluate(secondaryDiagonal)
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
            <MarkAvatar mark={mark} className={accentClass} />
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
  const { state, configure, start, nextRound } = useGameLoop()
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
          index,
        }
      }),
    )
  }, [board, boardSize])

  const winningLine = useMemo(() => findWinningLine(board), [board, boardSize])
  const winningCellSet = useMemo(() => {
    if (!winningLine) {
      return null
    }
    return new Set(winningLine.indices)
  }, [winningLine])
  const winningCellTheme = winningLine
    ? winningLine.mark === 'X'
      ? 'border-[#4ff2c2]/70 bg-[#4ff2c2]/15 shadow-[0_0_28px_rgba(79,242,194,0.45)]'
      : 'border-[#f15bb5]/70 bg-[#f15bb5]/12 shadow-[0_0_28px_rgba(241,91,181,0.45)]'
    : ''
  const confetti = useConfetti()
  const lastCelebrationKey = useRef<string | null>(null)
  const celebrationTypeRef = useRef<'fireworks' | 'sideCannons'>('sideCannons')
  const [roundSummaryOpen, setRoundSummaryOpen] = useState(false)
  const [dialogActionPending, setDialogActionPending] = useState(false)
  const lastDialogRoundRef = useRef<number | null>(null)
  const latestRoundSummary = state.roundSummaries.at(-1)
  const roundEnded = state.phase === 'betweenRounds' || state.phase === 'completed'

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
  const latestWinner = latestRoundSummary?.winner
  const winningModel =
    latestWinner === 'modelA'
      ? modelA
      : latestWinner === 'modelB'
        ? modelB
        : undefined
  const roundLabel = latestRoundSummary ? `Round ${latestRoundSummary.round}` : 'Round complete'
  const roundSummaryTitle =
    latestWinner === 'tie'
      ? `${roundLabel} ends in a tie`
      : latestWinner
        ? `${winningModel?.name ?? (latestWinner === 'modelA' ? 'Model A' : 'Model B')} wins ${roundLabel}`
        : 'Round complete'
  const roundSummarySubtitle =
    latestWinner === 'tie'
      ? 'Neither contender could break through. Review the full log before the next duel.'
      : winningModel
        ? `${winningModel.name}${winningModel.variant ? ` • ${winningModel.variant}` : ''} secured the board.`
        : 'Review the move log for the latest round.'
  const hasNextRound = state.currentRound < totalRounds
  const dialogCtaLabel = hasNextRound ? 'Next Round' : 'Rematch'
  const dialogScoreLine = `${modelA?.name ?? 'Model A'} ${scoreboard.modelA} — ${scoreboard.modelB} ${modelB?.name ?? 'Model B'} • ties ${scoreboard.ties}`
  const roundDialogOpen = roundSummaryOpen && Boolean(latestRoundSummary)
  const rematchReady =
    (state.modelAId ?? match?.modelAId) != null &&
    (state.modelBId ?? match?.modelBId) != null
  const dialogActionDisabled = dialogActionPending || (!hasNextRound && !rematchReady)

  const handleRoundDialogAction = useCallback(async () => {
    if (hasNextRound) {
      setRoundSummaryOpen(false)
      nextRound()
      return
    }

    const rematchModelAId = state.modelAId ?? match?.modelAId ?? null
    const rematchModelBId = state.modelBId ?? match?.modelBId ?? null

    if (rematchModelAId == null || rematchModelBId == null) {
      return
    }

    const rematchConfig: MatchConfig = {
      matchId: match?.id,
      modelAId: rematchModelAId,
      modelBId: rematchModelBId,
      boardSize,
      totalRounds,
      startingPlayer: 'alternate',
    }

    try {
      setDialogActionPending(true)
      setRoundSummaryOpen(false)
      configure(rematchConfig)
      await start()
      lastDialogRoundRef.current = null
    } catch (error) {
      console.error('[MatchBoard] Rematch start failed', error)
    } finally {
      setDialogActionPending(false)
    }
  }, [
    hasNextRound,
    nextRound,
    state.modelAId,
    state.modelBId,
    match,
    boardSize,
    totalRounds,
    configure,
    start,
  ])

  const runFireworks = useCallback(() => {
    if (typeof window === 'undefined' || !confetti) {
      return
    }
    const duration = 5000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 60 }
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) {
        window.clearInterval(interval)
        return
      }
      const particleCount = Math.round(50 * (timeLeft / duration))
      confetti.fire({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() * 0.2 },
      })
      confetti.fire({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() * 0.2 },
      })
    }, 250)

    return () => {
      window.clearInterval(interval)
    }
  }, [confetti])

  const runSideCannons = useCallback(() => {
    if (typeof window === 'undefined' || !confetti) {
      return
    }
    const end = Date.now() + 3000
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'] as const
    let rafId = 0

    const frame = () => {
      if (Date.now() > end) {
        return
      }
      confetti.fire({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: [...colors],
      })
      confetti.fire({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: [...colors],
      })
      rafId = window.requestAnimationFrame(frame)
    }

    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [confetti])

  useEffect(() => {
    if (!winningLine || !confetti) {
      return
    }
    const celebrationKey = `${state.currentRound}-${winningLine.indices.join('-')}`
    if (lastCelebrationKey.current === celebrationKey) {
      return
    }
    lastCelebrationKey.current = celebrationKey
    const nextType =
      celebrationTypeRef.current === 'fireworks' ? 'sideCannons' : 'fireworks'
    celebrationTypeRef.current = nextType

    const cleanup = nextType === 'fireworks' ? runFireworks() : runSideCannons()

    return () => {
      cleanup?.()
    }
  }, [winningLine, state.currentRound, runFireworks, runSideCannons, confetti])

  useEffect(() => {
    if (!roundEnded || !latestRoundSummary) {
      return
    }
    if (lastDialogRoundRef.current === latestRoundSummary.round) {
      return
    }
    lastDialogRoundRef.current = latestRoundSummary.round
    setRoundSummaryOpen(true)
  }, [roundEnded, latestRoundSummary])

  useEffect(() => {
    if ((!roundEnded || !latestRoundSummary) && roundSummaryOpen) {
      setRoundSummaryOpen(false)
    }
  }, [roundEnded, latestRoundSummary, roundSummaryOpen])

  return (
    <>
      <Dialog open={roundDialogOpen} onOpenChange={setRoundSummaryOpen}>
        {roundDialogOpen && latestRoundSummary ? (
          <DialogContent className="max-w-[90vw] sm:max-w-[90vw] border-white/15 bg-[#040716]/95 text-white">
            <DialogHeader className="gap-2">
              <DialogTitle className="font-display text-2xl text-white">
                {roundSummaryTitle}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {roundSummarySubtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
              <MatchMoveLog match={match} variant="recap" />
            </div>
            <DialogFooter className="mt-4 w-full items-center justify-between gap-3 sm:flex">
              <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                {dialogScoreLine}
              </span>
              <RainbowButton
                onClick={() => {
                  void handleRoundDialogAction()
                }}
                disabled={dialogActionDisabled}
              >
                {dialogCtaLabel}
              </RainbowButton>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
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
                        winningCellSet?.has(cell.index)
                          ? winningCellTheme
                          : 'hover:border-white/25 hover:bg-white/10',
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
    </>
  )
}
