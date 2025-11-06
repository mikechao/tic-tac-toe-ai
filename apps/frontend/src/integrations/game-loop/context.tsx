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

type GameLoopContextValue = {
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

export function GameLoopProvider({ children }: { children: React.ReactNode }) {
  const controllerRef = useRef<GameLoopController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createGameLoopController()
  }
  const controller = controllerRef.current

  const [state, setState] = useState<GameLoopState>(() => controller.getState())
  const [lastEvent, setLastEvent] = useState<GameLoopEvent | undefined>()
  const matchConfigRef = useRef<MatchConfig | null>(null)
  const turnInFlightRef = useRef(false)
  const turnAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsubscribe = controller.subscribe((nextState, event) => {
      console.debug('[GameLoopProvider] controller update', {
        phase: nextState.phase,
        activePlayer: nextState.activePlayer,
        event,
      })
      setState(nextState)
      setLastEvent(event)
    })

    return () => {
      console.debug('[GameLoopProvider] unsubscribe')
      unsubscribe()
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

    console.debug('[GameLoopProvider] turn effect check', {
      phase: state.phase,
      isPaused: state.isPaused,
      activePlayer: state.activePlayer,
      inFlight: turnInFlightRef.current,
      lastEvent,
      hasConfig: Boolean(config),
    })

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
      console.debug('[GameLoopProvider] turn effect skipping')
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
      console.warn('[GameLoopProvider] snapshot not ready for turn')
      return
    }

    const actor = snapshot.activePlayer
    const actorMark: PlayerMark = actor === 'modelA' ? 'X' : 'O'
    const opponentMark: PlayerMark = actorMark === 'X' ? 'O' : 'X'
    const board = snapshot.board
    if (board.getValidMoves().length === 0) {
      console.warn('[GameLoopProvider] No valid moves remaining, skipping turn')
      return
    }

    const abortController = new AbortController()
    turnAbortRef.current = abortController
    turnInFlightRef.current = true

    console.debug('[GameLoopProvider] requesting Gemini move', {
      activePlayer: actor,
      round: snapshot.currentRound,
    })

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
          console.debug('[GameLoopProvider] Gemini turn aborted')
          return
        }

        if (result.ok) {
          console.debug('[GameLoopProvider] Gemini move result', result)
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
          console.warn('[GameLoopProvider] Gemini move failure', result)
          controller.abort(result.message)
        }
      } catch (error) {
        console.error('[GameLoopProvider] Gemini turn executor error', error)
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
  }, [controller, state, lastEvent])

  return (
    <GameLoopContext.Provider
      value={{
        state,
        lastEvent,
        configure,
        start,
        pause,
        resume,
        abort,
        nextRound,
        recordMove,
        controller,
      }}
    >
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
