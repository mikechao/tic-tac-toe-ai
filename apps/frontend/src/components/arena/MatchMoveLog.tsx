import { useEffect, useMemo, useRef, useState } from 'react'

import { CirclePause, CirclePlay } from 'lucide-react'

import type { MatchListResponse } from '@arena/schema'

import { demoModels } from '@/data/demo.models'
import { cn } from '@/lib/utils'
import { AnimatedList, MagicCard, StateMessage } from '@/components/ui'

type MatchSummary = MatchListResponse['matches'][number]

type MoveEntry = {
  id: string
  modelKey: 'modelA' | 'modelB'
  coordinate: string
  mark: 'X' | 'O'
  round: number
  turn: number
  durationSeconds: number
  timestamp: string
  rationale: string
}

const mockMoves: MoveEntry[] = [
  {
    id: 'move-1',
    modelKey: 'modelA',
    coordinate: 'A1',
    mark: 'X',
    round: 1,
    turn: 1,
    durationSeconds: 1.8,
    timestamp: '2025-10-01T15:32:12.000Z',
    rationale: 'Opened on the corner to create dual-win threats rapidly.',
  },
  {
    id: 'move-2',
    modelKey: 'modelB',
    coordinate: 'B2',
    mark: 'O',
    round: 1,
    turn: 2,
    durationSeconds: 2.6,
    timestamp: '2025-10-01T15:32:14.300Z',
    rationale: 'Countered with center control to block future forks.',
  },
  {
    id: 'move-3',
    modelKey: 'modelA',
    coordinate: 'C3',
    mark: 'X',
    round: 1,
    turn: 3,
    durationSeconds: 2.1,
    timestamp: '2025-10-01T15:32:16.700Z',
    rationale: 'Established diagonal dominance, setting up closing edge.',
  },
  {
    id: 'move-4',
    modelKey: 'modelB',
    coordinate: 'A2',
    mark: 'O',
    round: 1,
    turn: 4,
    durationSeconds: 3.3,
    timestamp: '2025-10-01T15:32:20.200Z',
    rationale: 'Blocked diagonal threat while opening vertical counter.',
  },
  {
    id: 'move-5',
    modelKey: 'modelA',
    coordinate: 'B3',
    mark: 'X',
    round: 1,
    turn: 5,
    durationSeconds: 1.9,
    timestamp: '2025-10-01T15:32:22.000Z',
    rationale: 'Forced opponent to defend bottom row, maintaining tempo.',
  },
]

export function MatchMoveLog({ match }: { match?: MatchSummary }) {
  if (!match) {
    return (
      <MagicCard
        className="border-white/15 bg-white/[0.04] px-0 py-0"
        spotlight={false}
      >
        <div className="flex h-full items-center justify-center rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-8">
          <StateMessage
            title="No move history yet"
            description="As soon as a match begins, we’ll record every move with reasoning and timing details."
          />
        </div>
      </MagicCard>
    )
  }
  const [isPaused, setIsPaused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const modelA = useMemo(
    () => demoModels.find((model) => model.id === match.modelAId),
    [match.modelAId],
  )
  const modelB = useMemo(
    () => demoModels.find((model) => model.id === match.modelBId),
    [match.modelBId],
  )

  const resolvedMoves = useMemo(
    () =>
      mockMoves.map((move) => ({
        ...move,
        model:
          move.modelKey === 'modelA'
            ? (modelA ?? demoModels[0])
            : (modelB ?? demoModels[1]),
      })),
    [modelA, modelB],
  )

  useEffect(() => {
    if (isPaused || !listRef.current) return
    const element = listRef.current
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    })
  }, [resolvedMoves, isPaused])

  const latestMoveId = resolvedMoves[resolvedMoves.length - 1]?.id
  const showEmptyState = resolvedMoves.length === 0

  return (
    <MagicCard
      className="border-white/15 bg-white/[0.04] px-0 py-0"
      spotlight={false}
    >
      <div className="flex h-full flex-col gap-4 rounded-[1.45rem] bg-[#0b1026]/70 px-6 py-6 text-white backdrop-blur">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Move Log
            </p>
            <h3 className="font-display text-xl">
              Reviewing round {resolvedMoves[0]?.round ?? 1}
            </h3>
            <p className="text-sm text-white/70">
              Auto-scroll keeps you at the latest move; pause anytime to inspect
              a turn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPaused((previous) => !previous)}
            className={cn(
              'inline-flex items-center justify-center rounded-full border border-white/20 p-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
              isPaused
                ? 'bg-white/10 text-white hover:bg-white/15 hover:cursor-pointer'
                : 'bg-[#4ff2c2]/20 text-white hover:bg-[#4ff2c2]/30 hover:cursor-pointer',
            )}
            aria-pressed={isPaused}
            aria-label={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? (
              <CirclePlay className="h-10 w-10" />
            ) : (
              <CirclePause className="h-10 w-10" />
            )}
          </button>
        </header>

        <div
          ref={listRef}
          className="relative max-h-80 overflow-y-auto pr-1"
          role="log"
          aria-live={isPaused ? 'off' : 'polite'}
        >
          {showEmptyState ? (
            <div className="px-2 py-6">
              <StateMessage
                title="Waiting for the first move"
                description="Once the contenders make their opening plays, we’ll populate this log with timestamps and rationale."
                className="w-full"
              />
            </div>
          ) : (
            <AnimatedList className="flex flex-col gap-3" delay={600}>
              {resolvedMoves.map((move) => {
                const isLatest = move.id === latestMoveId
                return (
                  <article
                    key={move.id}
                    className={cn(
                      'rounded-2xl border border-white/12 bg-white/5 p-4 text-sm transition',
                      isLatest
                        ? 'border-[#4ff2c2]/50 shadow-[0_0_28px_rgba(79,242,194,0.25)]'
                        : 'hover:border-white/25 hover:bg-white/10',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 min-w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-semibold uppercase',
                          move.mark === 'X'
                            ? 'text-[#4ff2c2]'
                            : 'text-[#f15bb5]',
                        )}
                        aria-hidden="true"
                      >
                        {move.mark}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                        <p className="font-semibold text-white">
                          {move.model.name}{' '}
                          <span className="text-white/60">
                            · round {move.round}, turn {move.turn}
                          </span>
                        </p>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                          {new Date(move.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <span className="ml-auto text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                        {move.coordinate} · {move.durationSeconds.toFixed(1)}s
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-white/70">{move.rationale}</p>
                    </div>
                  </article>
                )
              })}
            </AnimatedList>
          )}
        </div>
      </div>
    </MagicCard>
  )
}
