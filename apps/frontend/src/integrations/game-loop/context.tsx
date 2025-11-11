import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  createGameLoopController,
  type GameLoopController,
  type GameLoopEvent,
  type GameLoopState,
  type MatchConfig,
  type RecordMoveInput,
} from '@/lib/game/game-loop'
import {
  requestGeminiMove,
  requestTransformersMove,
  type GeminiMoveRequest,
} from '@/lib/game/ai-turn'
import type { PlayerMark } from '@/lib/game/board-state'
import { localAIModels } from '@/data/models'
import { useTransformersModel } from '@/hooks/useTransformersModel'

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
  cancelMatch: () => void
  reset: () => void
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
  const {
    ensureModel: ensureTransformersModel,
    isSupported: transformersSupported,
    isInferenceActive: transformersInferenceActive,
    setInferenceActive: setTransformersInferenceActive,
  } = useTransformersModel()

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
  const reset = useCallback(() => controller.reset(), [controller])
  const cancelMatch = useCallback(() => controller.cancelMatch(), [controller])

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

    if (!config) {
      return
    }

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

    const actorModelId = actor === 'modelA' ? config.modelAId : config.modelBId
    const actorModelMeta =
      localAIModels.find((model) => model.id === actorModelId) ?? localAIModels[0]
    const providerId = actorModelMeta?.provider ?? 'chrome-builtin'
    const providerLabel =
      providerId === 'transformers-js' ? 'SmolLM2' : 'Gemini Nano'

    if (providerId === 'transformers-js' && !transformersSupported) {
      console.warn('[GameLoopProvider] Transformers.js unsupported in this browser')
      controller.abort('SmolLM2 requires a WebGPU-capable browser. Select another model.')
      return
    }

    let releaseInference: (() => void) | undefined
    if (providerId === 'transformers-js') {
      if (transformersInferenceActive) {
        console.warn('[GameLoopProvider] Transformers inference already active')
        controller.abort('SmolLM2 is busy completing another turn. Please wait.')
        return
      }
      setTransformersInferenceActive(true)
      releaseInference = () => setTransformersInferenceActive(false)
    }

    const abortController = new AbortController()
    turnAbortRef.current = abortController
    turnInFlightRef.current = true

    console.debug('[GameLoopProvider] requesting move', {
      provider: providerId,
      activePlayer: actor,
      round: snapshot.currentRound,
    })

    const baseRequest: GeminiMoveRequest = {
      board,
      activeMark: actorMark,
      opponentMark,
      round: snapshot.currentRound,
      totalRounds: snapshot.totalRounds,
      actorLabel: actor,
      timeoutMs: config.moveTimeoutMs,
      abortSignal: abortController.signal,
    }

    ;(async () => {
      try {
        const result =
          providerId === 'transformers-js'
            ? await requestTransformersMove(baseRequest, async () => ensureTransformersModel())
            : await requestGeminiMove(baseRequest)

        if (abortController.signal.aborted) {
          console.debug('[GameLoopProvider] turn aborted', { provider: providerId })
          return
        }

        if (result.ok) {
          console.debug('[GameLoopProvider] move result', {
            provider: providerId,
            result,
          })
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
          console.warn('[GameLoopProvider] move failure', {
            provider: providerId,
            result,
          })
          controller.abort(result.message)
        }
      } catch (error) {
        console.error('[GameLoopProvider] turn executor error', {
          provider: providerId,
          error,
        })
        if (!abortController.signal.aborted) {
          const message =
            error instanceof Error ? error.message : 'Unexpected AI turn error'
          controller.abort(message)
        }
      } finally {
        if (releaseInference) {
          releaseInference()
        }
        if (turnAbortRef.current === abortController) {
          turnAbortRef.current = null
        }
        turnInFlightRef.current = false
      }
    })()

    return () => {
      // Only abort if no turn is currently in flight
      // If a turn is in flight, let it complete naturally or abort itself
      if (!abortController.signal.aborted && !turnInFlightRef.current) {
        abortController.abort()
      }
    }
  }, [
    controller,
    state,
    lastEvent,
    ensureTransformersModel,
    transformersSupported,
    transformersInferenceActive,
    setTransformersInferenceActive,
  ])

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
        cancelMatch,
        reset,
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
