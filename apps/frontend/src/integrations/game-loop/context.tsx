import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  createGameLoopController,
  type GameLoopController,
  type GameLoopEvent,
  type GameLoopState,
  type MatchConfig,
  type RecordMoveInput,
} from '@/lib/game/game-loop'
import { requestGeminiMove } from '@/lib/game/ai-turn'
import type { PlayerMark } from '@/lib/game/board-state'

type GameLoopStore = {
  state: GameLoopState
  lastEvent?: GameLoopEvent
}

type GameLoopContextValue = {
  store: GameLoopStore
  state: GameLoopState
  lastEvent?: GameLoopEvent
  configure: (config: MatchConfig) => void
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  abort: (reason?: string) => void
  nextRound: () => void
  recordMove: (input: RecordMoveInput) => void
  controller: GameLoopController
}

const GameLoopContext = createContext<GameLoopContextValue | undefined>(
  undefined,
)

export function GameLoopProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<GameLoopController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createGameLoopController()
  }
  const controller = controllerRef.current
  const [store, setStore] = useState<GameLoopStore>(() => ({
    state: controller.getState(),
    lastEvent: undefined,
  }))
  const { state, lastEvent } = store
  const matchConfigRef = useRef<MatchConfig | null>(null)
  const turnInFlightRef = useRef(false)
  const turnAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState, event) => {
      setStore({ state: nextState, lastEvent: event })
    })
    return () => {
      unsubscribe()
      controller.dispose()
      controllerRef.current = null
      matchConfigRef.current = null
      turnAbortRef.current?.abort()
      turnAbortRef.current = null
      turnInFlightRef.current = false
    }
  }, [])

  const configure = useCallback(
    (config: MatchConfig) => {
      matchConfigRef.current = config
      controller.configure(config)
    },
    [controller],
  )

  const start = useCallback(() => controller.start(), [controller])
  const pause = useCallback(() => controller.pause(), [controller])
  const resume = useCallback(() => controller.resume(), [controller])
  const abort = useCallback(
    (reason?: string) => controller.abort(reason),
    [controller],
  )
  const nextRound = useCallback(() => controller.nextRound(), [controller])
  const recordMove = useCallback(
    (input: RecordMoveInput) => controller.recordMove(input),
    [controller],
  )

  useEffect(() => {
    const config = matchConfigRef.current
    const { state, lastEvent } = store

    const shouldRunTurn =
      config &&
      state.phase === 'running' &&
      !state.isPaused &&
      state.activePlayer != null &&
      !turnInFlightRef.current &&
      lastEvent &&
      ((lastEvent.type === 'phase:change' && lastEvent.phase === 'running') ||
        lastEvent.type === 'move:recorded' ||
        lastEvent.type === 'board:update')

    if (!shouldRunTurn) {
      if (
        (state.phase !== 'running' || state.activePlayer == null || state.isPaused) &&
        turnAbortRef.current
      ) {
        turnAbortRef.current.abort()
        turnAbortRef.current = null
        turnInFlightRef.current = false
      }
      return
    }

    const snapshot = controller.getState()
    if (snapshot.activePlayer == null || snapshot.phase !== 'running') {
      return
    }

    const actor = snapshot.activePlayer
    const actorMark: PlayerMark = actor === 'modelA' ? 'X' : 'O'
    const opponentMark: PlayerMark = actorMark === 'X' ? 'O' : 'X'
    const board = snapshot.board
    if (board.getValidMoves().length === 0) {
      return
    }

    const abortController = new AbortController()
    turnAbortRef.current = abortController
    turnInFlightRef.current = true

    ;(async () => {
      try {
        const result = await requestGeminiMove({
          board,
          activeMark: actorMark,
          opponentMark,
          round: snapshot.currentRound,
          totalRounds: snapshot.totalRounds,
          actorLabel: actor,
          timeoutMs: config.moveTimeoutMs,
          abortSignal: abortController.signal,
        })

        if (abortController.signal.aborted) {
          return
        }

        if (result.ok) {
          controller.recordMove({
            actor,
            move: result.move,
            rationale: result.rationale,
            durationMs: result.durationMs,
            rawResponse: result.raw,
            wasValid: true,
            timestamp: Date.now(),
            timeout: false,
          })
        } else {
          controller.abort(result.message)
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          const message =
            error instanceof Error ? error.message : 'Unexpected AI turn error'
          controller.abort(message)
        }
      } finally {
        if (turnAbortRef.current === abortController) {
          turnAbortRef.current = null
        }
        turnInFlightRef.current = false
      }
    })()

    return () => {
      if (!abortController.signal.aborted) {
        abortController.abort()
      }
    }
  }, [controller, state.phase, state.isPaused, state.activePlayer, lastEvent])

  const value: GameLoopContextValue = {
    store,
    state: store.state,
    lastEvent: store.lastEvent,
    configure,
    start,
    pause,
    resume,
    abort,
    nextRound,
    recordMove,
    controller,
  }

  return (
    <GameLoopContext.Provider value={value}>
      {children}
    </GameLoopContext.Provider>
  )
}

export function useGameLoop(): GameLoopContextValue {
  const context = useContext(GameLoopContext)
  if (!context) {
    throw new Error('useGameLoop must be used within a GameLoopProvider')
  }
  return context
}
