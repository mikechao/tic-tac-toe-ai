import type { Move, PlayerMark } from './board-state'
import { BoardState } from './board-state'
import { MatchLog, type MoveLogEntry } from './match-log'

export type GameLoopPhase =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'betweenRounds'
  | 'completed'
  | 'error'

export interface MatchConfig {
  matchId?: number
  modelAId: number
  modelBId: number
  boardSize: number
  totalRounds: number
  startingPlayer: 'modelA' | 'modelB' | 'alternate'
  moveTimeoutMs?: number
}

export type { MoveLogEntry } from './match-log'

export interface RoundSummary {
  round: number
  winner: 'modelA' | 'modelB' | 'tie'
  totalMoves: number
  durationMs: number
  boardSnapshot: string
}

export interface GameLoopState {
  phase: GameLoopPhase
  currentRound: number
  totalRounds: number
  activePlayer: 'modelA' | 'modelB' | null
  board: BoardState
  roundBoards: BoardState[]
  score: { modelA: number; modelB: number; ties: number }
  moveHistory: MoveLogEntry[]
  roundSummaries: RoundSummary[]
  lastError?: string
  isPaused: boolean
}

export type GameLoopEvent =
  | { type: 'phase:change'; phase: GameLoopPhase }
  | { type: 'board:update'; board: BoardState }
  | { type: 'move:recorded'; entry: MoveLogEntry }
  | { type: 'round:complete'; summary: RoundSummary }
  | {
      type: 'match:complete'
      summaries: RoundSummary[]
      score: GameLoopState['score']
    }
  | { type: 'error'; message: string }

export interface GameLoopController {
  getState(): GameLoopState
  getMatchLog(): MoveLogEntry[]
  getBoardAscii(includeMeta?: boolean): string
  subscribe(
    listener: (state: GameLoopState, event?: GameLoopEvent) => void,
  ): () => void
  configure(config: MatchConfig): void
  start(): Promise<void>
  pause(): void
  resume(): void
  abort(reason?: string): void
  nextRound(): void
  recordMove(input: RecordMoveInput): void
  dispose(): void
}

const defaultScore = { modelA: 0, modelB: 0, ties: 0 }

const createInitialState = (): GameLoopState => ({
  phase: 'idle',
  currentRound: 0,
  totalRounds: 0,
  activePlayer: null,
  board: new BoardState(),
  roundBoards: [],
  score: { ...defaultScore },
  moveHistory: [],
  roundSummaries: [],
  isPaused: false,
})

const cloneMoveEntry = (entry: MoveLogEntry): MoveLogEntry => ({ ...entry })

const cloneRoundSummary = (summary: RoundSummary): RoundSummary => ({
  ...summary,
})

const cloneScore = (score: GameLoopState['score']): GameLoopState['score'] => ({
  ...score,
})

const cloneGameLoopState = (snapshot: GameLoopState): GameLoopState => ({
  ...snapshot,
  board: snapshot.board.clone(),
  roundBoards: snapshot.roundBoards.map((board) => board.clone()),
  score: cloneScore(snapshot.score),
  moveHistory: snapshot.moveHistory.map(cloneMoveEntry),
  roundSummaries: snapshot.roundSummaries.map(cloneRoundSummary),
})

const cloneGameLoopEvent = (event: GameLoopEvent): GameLoopEvent => {
  switch (event.type) {
    case 'board:update':
      return { type: 'board:update', board: event.board.clone() }
    case 'move:recorded':
      return { type: 'move:recorded', entry: cloneMoveEntry(event.entry) }
    case 'round:complete':
      return { type: 'round:complete', summary: cloneRoundSummary(event.summary) }
    case 'match:complete':
      return {
        type: 'match:complete',
        summaries: event.summaries.map(cloneRoundSummary),
        score: cloneScore(event.score),
      }
    default:
      return event
  }
}

type GameLoopAction =
  | { type: 'CONFIGURE'; config: MatchConfig }
  | { type: 'START' }
  | { type: 'BEGIN_ROUND'; round: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ABORT'; reason?: string }
  | { type: 'ADVANCE_TO_BETWEEN_ROUNDS' }
  | { type: 'RECORD_MOVE'; payload: RecordMoveActionPayload }
  | { type: 'ERROR'; message: string }

type RecordMoveActionPayload = {
  entry: MoveLogEntry
  board: BoardState
  roundCompleted: boolean
  winner: 'modelA' | 'modelB' | 'tie' | null
  roundSummary?: RoundSummary
  nextActivePlayer: 'modelA' | 'modelB' | null
}

type TransitionResult = {
  state: GameLoopState
  events?: GameLoopEvent[]
}

type TransitionContext = {
  config: MatchConfig | null
  matchLog: MatchLog
}

type TransitionHandler = (
  current: GameLoopState,
  action: GameLoopAction,
  context: TransitionContext,
) => TransitionResult

const determineStartingPlayer = (
  config: MatchConfig,
  round: number,
): 'modelA' | 'modelB' => {
  console.debug('[GameLoopController] determineStartingPlayer', {
    round,
    startingPlayer: config.startingPlayer,
  })
  if (config.startingPlayer === 'alternate') {
    return round % 2 === 1 ? 'modelA' : 'modelB'
  }
  return config.startingPlayer
}

const toPlayerMark = (player: 'modelA' | 'modelB'): PlayerMark =>
  player === 'modelA' ? 'X' : 'O'

const markToActor = (mark: PlayerMark): 'modelA' | 'modelB' =>
  mark === 'X' ? 'modelA' : 'modelB'

export type RecordMoveInput = {
  actor: 'modelA' | 'modelB'
  move: Move
  rationale: string
  durationMs: number
  rawResponse?: unknown
  wasValid?: boolean
  timeout?: boolean
  timestamp?: number
  roundDurationMs?: number
}

const transitionMap: Record<
  GameLoopPhase,
  Partial<Record<GameLoopAction['type'], TransitionHandler>>
> = {
  idle: {
    CONFIGURE: (current, action) => {
      console.debug('[GameLoopController] transition idle.CONFIGURE')
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          totalRounds: config.totalRounds,
          board,
          roundBoards: [],
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [{ type: 'board:update', board }],
      }
    },
    START: (current, _action, context) => {
      console.debug('[GameLoopController] transition idle.START')
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const totalRounds = context.config.totalRounds
      const roundBoards = Array.from({ length: totalRounds }, (_, index) => {
        const roundNumber = index + 1
        const startingPlayer = determineStartingPlayer(context.config!, roundNumber)
        return new BoardState(
          context.config!.boardSize,
          toPlayerMark(startingPlayer),
        )
      })
      const firstBoard = roundBoards[0] ?? new BoardState(context.config.boardSize)
      return {
        state: {
          ...current,
          phase: 'initializing',
          currentRound: 0,
          totalRounds,
          activePlayer: null,
          board: firstBoard,
          roundBoards,
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'initializing' },
          { type: 'board:update', board: firstBoard },
        ],
      }
    },
  },
  initializing: {
    BEGIN_ROUND: (current, action, context) => {
      console.debug('[GameLoopController] transition initializing.BEGIN_ROUND')
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            currentRound: context.config.totalRounds,
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          totalRounds: context.config.totalRounds,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ERROR: (current, action) => {
      console.debug('[GameLoopController] transition initializing.ERROR')
      const { message } = action as Extract<GameLoopAction, { type: 'ERROR' }>
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          { type: 'error', message },
        ],
      }
    },
  },
  running: {
    PAUSE: (current) => {
      console.debug('[GameLoopController] transition running.PAUSE')
      return {
        state: { ...current, isPaused: true },
      }
    },
    RESUME: (current) => {
      console.debug('[GameLoopController] transition running.RESUME')
      return {
        state: { ...current, isPaused: false },
      }
    },
    ABORT: (current, action) => {
      console.debug('[GameLoopController] transition running.ABORT')
      const { reason } = action as Extract<GameLoopAction, { type: 'ABORT' }>
      const message = reason ?? 'Match aborted'
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          {
            type: 'error',
            message,
          },
        ],
      }
    },
    BEGIN_ROUND: (current, action, context) => {
      console.debug('[GameLoopController] transition running.BEGIN_ROUND')
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [{ type: 'board:update', board }],
      }
    },
    ADVANCE_TO_BETWEEN_ROUNDS: (current) => {
      console.debug(
        '[GameLoopController] transition running.ADVANCE_TO_BETWEEN_ROUNDS',
      )
      return {
        state: {
          ...current,
          phase: 'betweenRounds',
          activePlayer: null,
          isPaused: false,
        },
        events: [{ type: 'phase:change', phase: 'betweenRounds' }],
      }
    },
    RECORD_MOVE: (current, action, context) => {
      console.debug('[GameLoopController] transition running.RECORD_MOVE')
      const { payload } = action as Extract<
        GameLoopAction,
        { type: 'RECORD_MOVE' }
      >
      context.matchLog.append(payload.entry)
      const moveHistorySnapshot = context.matchLog.getEntries()
      const events: GameLoopEvent[] = [
        { type: 'board:update', board: payload.board },
        { type: 'move:recorded', entry: payload.entry },
      ]

      let nextScore = current.score
      let nextSummaries = current.roundSummaries
      let nextPhase: GameLoopPhase = current.phase
      let nextActivePlayer = payload.nextActivePlayer

      if (payload.roundCompleted) {
        const scoreUpdate = { ...current.score }
        if (payload.winner === 'modelA') {
          scoreUpdate.modelA += 1
        } else if (payload.winner === 'modelB') {
          scoreUpdate.modelB += 1
        } else if (payload.winner === 'tie') {
          scoreUpdate.ties += 1
        }
        nextScore = scoreUpdate

        if (payload.roundSummary) {
          const summaries = [...current.roundSummaries, payload.roundSummary]
          nextSummaries = summaries
          events.push({ type: 'round:complete', summary: payload.roundSummary })
        }

        const isFinalRound = current.currentRound === current.totalRounds

        if (isFinalRound) {
          nextPhase = 'completed'
          nextActivePlayer = null
          events.push({ type: 'phase:change', phase: 'completed' })
          events.push({ type: 'match:complete', summaries: nextSummaries, score: nextScore })
        } else {
          nextPhase = 'betweenRounds'
          nextActivePlayer = null
          events.push({ type: 'phase:change', phase: 'betweenRounds' })
        }
      }

      return {
        state: {
          ...current,
          phase: nextPhase,
          board: payload.board,
          moveHistory: moveHistorySnapshot,
          score: nextScore,
          roundSummaries: nextSummaries,
          activePlayer: nextActivePlayer,
          isPaused: false,
        },
        events,
      }
    },
  },
  betweenRounds: {
    BEGIN_ROUND: (current, action, context) => {
      console.debug('[GameLoopController] transition betweenRounds.BEGIN_ROUND')
      if (!context.config) {
        throw new Error('Match configuration missing. Call configure() first.')
      }
      const { round } = action as Extract<GameLoopAction, { type: 'BEGIN_ROUND' }>
      if (round > context.config.totalRounds) {
        return {
          state: {
            ...current,
            phase: 'completed',
            activePlayer: null,
            isPaused: false,
          },
          events: [{ type: 'phase:change', phase: 'completed' }],
        }
      }
      const startingPlayer = determineStartingPlayer(context.config, round)
      const startingMark = toPlayerMark(startingPlayer)
      const nextRoundBoards = [...current.roundBoards]
      const roundIndex = Math.max(0, round - 1)
      let board = nextRoundBoards[roundIndex]
      if (!board) {
        board = new BoardState(context.config.boardSize, startingMark)
        nextRoundBoards[roundIndex] = board
      } else {
        board.reset(startingMark)
      }
      return {
        state: {
          ...current,
          phase: 'running',
          currentRound: round,
          activePlayer: startingPlayer,
          board,
          roundBoards: nextRoundBoards,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'running' },
          { type: 'board:update', board },
        ],
      }
    },
    ABORT: (current, action) => {
      console.debug('[GameLoopController] transition betweenRounds.ABORT')
      const { reason } = action as Extract<GameLoopAction, { type: 'ABORT' }>
      const message = reason ?? 'Match aborted'
      return {
        state: {
          ...current,
          phase: 'error',
          lastError: message,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'error' },
          {
            type: 'error',
            message,
          },
        ],
      }
    },
  },
  completed: {
    CONFIGURE: (current, action) => {
      console.debug('[GameLoopController] transition completed.CONFIGURE')
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          roundBoards: [],
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'idle' },
          { type: 'board:update', board },
        ],
      }
    },
  },
  error: {
    CONFIGURE: (current, action) => {
      console.debug('[GameLoopController] transition error.CONFIGURE')
      const { config } = action as Extract<GameLoopAction, { type: 'CONFIGURE' }>
      const board = new BoardState(config.boardSize)
      return {
        state: {
          ...current,
          phase: 'idle',
          currentRound: 0,
          totalRounds: config.totalRounds,
          activePlayer: null,
          board,
          roundBoards: [],
          score: { ...defaultScore },
          moveHistory: [],
          roundSummaries: [],
          lastError: undefined,
          isPaused: false,
        },
        events: [
          { type: 'phase:change', phase: 'idle' },
          { type: 'board:update', board },
        ],
      }
    },
  },
}

const validateConfig = (config: MatchConfig): void => {
  if (config.totalRounds <= 0) {
    throw new Error('totalRounds must be greater than 0')
  }
  if (config.boardSize < 3 || config.boardSize > 5) {
    throw new Error('boardSize must be between 3 and 5')
  }
}

export interface GameLoopControllerOptions {
  loadModelSession?: (modelId: number) => Promise<unknown>
  onPhaseChange?: (phase: GameLoopPhase) => void
}

export function createGameLoopController(
  options: GameLoopControllerOptions = {},
): GameLoopController {
  let state = createInitialState()
  let config: MatchConfig | null = null
  const matchLog = new MatchLog()
  const { loadModelSession } = options
  const phaseCallback = options.onPhaseChange
  const modelSessions = new Map<number, unknown>()
  const listeners = new Set<
    (next: GameLoopState, event?: GameLoopEvent) => void
  >()

  const notify = (
    event?: GameLoopEvent,
    snapshot?: GameLoopState,
  ): void => {
    const nextSnapshot = snapshot ?? cloneGameLoopState(state)
    const eventPayload = event ? cloneGameLoopEvent(event) : undefined
    console.debug('[GameLoopController] notify', {
      listeners: listeners.size,
      event: eventPayload,
      phase: nextSnapshot.phase,
      activePlayer: nextSnapshot.activePlayer,
    })
    if (eventPayload?.type === 'phase:change' && phaseCallback) {
      phaseCallback(eventPayload.phase)
    }
    for (const listener of listeners) {
      listener(nextSnapshot, eventPayload)
    }
  }

  const publish = (result: TransitionResult): void => {
    state = result.state
    const snapshot = cloneGameLoopState(state)
    notify(undefined, snapshot)
    if (result.events) {
      for (const event of result.events) {
        notify(event, snapshot)
      }
    }
  }

  const dispatch = (action: GameLoopAction): void => {
    if (action.type === 'CONFIGURE') {
      // allow configure regardless of current phase via fallback to idle handler
      const handler =
        transitionMap[state.phase]?.[action.type] ??
        transitionMap.idle[action.type as 'CONFIGURE']
      if (!handler) {
        return
      }
      const result = handler(state, action, { config, matchLog })
      publish(result)
      return
    }
    const handlers = transitionMap[state.phase]
    const handler = handlers?.[action.type]
    if (!handler) {
      return
    }
    const result = handler(state, action, { config, matchLog })
    publish(result)
  }

  const primeModelSessions = async (
    matchConfig: MatchConfig,
  ): Promise<void> => {
    if (!loadModelSession) {
      return
    }
    const uniqueModelIds = new Set<number>([
      matchConfig.modelAId,
      matchConfig.modelBId,
    ])
    await Promise.all(
      Array.from(uniqueModelIds).map(async (modelId) => {
        if (modelSessions.has(modelId)) {
          return
        }
        const session = await loadModelSession(modelId)
        modelSessions.set(modelId, session)
      }),
    )
  }

  const getState = (): GameLoopState => cloneGameLoopState(state)

  const getMatchLog = (): MoveLogEntry[] => matchLog.getEntries()

  const getBoardAscii = (includeMeta = true): string =>
    state.board.toAscii(includeMeta)

  const subscribe = (
    listener: (next: GameLoopState, event?: GameLoopEvent) => void,
  ): (() => void) => {
    listeners.add(listener)
    console.debug('[GameLoopController] listener added', {
      size: listeners.size,
    })
    listener(cloneGameLoopState(state))
    return () => {
      listeners.delete(listener)
      console.debug('[GameLoopController] listener removed', {
        size: listeners.size,
      })
    }
  }

  const configure = (nextConfig: MatchConfig): void => {
    console.debug('[GameLoopController] configure called', nextConfig)
    validateConfig(nextConfig)
    config = nextConfig
    matchLog.clear()
    dispatch({ type: 'CONFIGURE', config: nextConfig })
  }

  const start = async (): Promise<void> => {
    console.debug('[GameLoopController] start called')
    dispatch({ type: 'START' })
    if (!config) {
      throw new Error('Match configuration missing. Call configure() first.')
    }
    try {
      await primeModelSessions(config)
      dispatch({ type: 'BEGIN_ROUND', round: 1 })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize match'
      dispatch({ type: 'ERROR', message })
      throw error
    }
  }

  const pause = (): void => {
    dispatch({ type: 'PAUSE' })
  }

  const resume = (): void => {
    dispatch({ type: 'RESUME' })
  }

  const abort = (_reason?: string): void => {
    dispatch({ type: 'ABORT', reason: _reason })
  }

  const nextRound = (): void => {
    if (!config) {
      throw new Error('Match configuration missing. Call configure() first.')
    }
    if (state.phase !== 'betweenRounds') {
      throw new Error('nextRound can only be called from the betweenRounds phase')
    }

    const targetRound = state.currentRound + 1
    dispatch({ type: 'BEGIN_ROUND', round: targetRound })
  }

  const recordMove = (input: RecordMoveInput): void => {
    if (state.phase !== 'running') {
      throw new Error('Cannot record a move when the match is not running')
    }
    if (!config) {
      throw new Error('Match configuration missing. Call configure() first.')
    }

    const board = state.board
    const actorMark = toPlayerMark(input.actor)
    const move = input.move

    if (!board.isValidMove(move)) {
      throw new Error('Attempted to apply an invalid move')
    }

    board.applyMove(move, actorMark)

    const turn =
      state.moveHistory.filter((entry) => entry.round === state.currentRound)
        .length + 1

    const timestamp = input.timestamp ?? Date.now()
    const wasValid = input.wasValid ?? true

    const moveEntry: MoveLogEntry = {
      round: state.currentRound,
      turn,
      actor: input.actor,
      moveNumber: move.index + 1,
      rationale: input.rationale,
      wasValid,
      durationMs: input.durationMs,
      rawResponse: input.rawResponse,
      timestamp,
      timeout: input.timeout,
    }

    const winnerMark = board.checkWinner()
    let winner: 'modelA' | 'modelB' | 'tie' | null = null

    if (winnerMark) {
      winner = markToActor(winnerMark)
    } else if (board.isDraw()) {
      winner = 'tie'
    }

    const roundCompleted = winner !== null

    const roundSummary: RoundSummary | undefined = roundCompleted
      ? {
          round: state.currentRound,
          winner,
          totalMoves: turn,
          durationMs: input.roundDurationMs ?? input.durationMs,
          boardSnapshot: board.toAscii(),
        }
      : undefined

    const nextActivePlayer = roundCompleted
      ? null
      : markToActor(board.currentPlayer)

    dispatch({
      type: 'RECORD_MOVE',
      payload: {
        entry: moveEntry,
        board,
        roundCompleted,
        winner,
        roundSummary,
        nextActivePlayer,
      },
    })
  }

  const dispose = (): void => {
    listeners.clear()
    state = createInitialState()
    config = null
    matchLog.clear()
    notify()
    notify({ type: 'phase:change', phase: state.phase })
  }

  return {
    getState,
    getMatchLog,
    getBoardAscii,
    subscribe,
    configure,
    start,
    pause,
    resume,
    abort,
    nextRound,
    recordMove,
    dispose,
  }
}
