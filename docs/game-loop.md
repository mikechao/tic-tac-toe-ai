# Arena Game Loop Brainstorm

## Objective
Create a front-end controller that connects:
- `BoardState` (`src/lib/game/board-state.ts`) for per-round board logic.
- Gemini Nano integration (`src/integrations/gemini/model.ts`) for AI turns.
- Match configuration and UI surfaces (`components/arena/*`) launched from `MatchControls`.

This controller should orchestrate multi-round matches, surface updates to the board, telemetry, and move log, and manage model lifecycle (downloads, errors, retries).

## Core Responsibilities
- **Configuration intake:** accept the match payload from `MatchControls` (model A/B ids, round count). Validate and emit errors back to the toast system.
- **Session setup:** instantiate a `BoardState` per round, track overall score, and prefetch Gemini models (or any other selected engines).
- **Turn engine:** alternate between players, serialize the board via `toAscii()`, and feed prompts to the active model. Apply returned moves via `applyMove`, with guard rails for invalid or repeated cells.
- **Outcome evaluation:** after each move, call `checkWinner`/`isDraw`, advance to the next round, update aggregate stats, and trigger telemetry/move-log events.
- **UI broadcast:** expose observable state (current board, next player, countdowns, streaks) via context or a shared store so `MatchBoard`, `MatchTelemetry`, and `MatchMoveLog` stay in sync.
- **Lifecycle hooks:** pause/resume for user controls, allow abort/reset, and surface errors (Gemini download blocked, inference failure) with actionable messaging.

## Proposed Structure
- New module `src/lib/game/game-loop.ts` exporting `createGameLoopController(config)`.
- Internally use a state machine (e.g., simple enum or `xstate` later) to handle phases: `idle → initializing → running → betweenRounds → complete → error`.
- Controller returns an object with:
  - `state` (current phase, round index, scores, board snapshot, telemetry).
  - `subscribe(listener)` or tie into React context provider for UI consumption.
  - `start()`, `pause()`, `resume()`, `abort()`, `nextRound()` methods.
- Consider a `useGameLoop` hook that encapsulates controller wiring for components.

## Integration Points To Cover
- **MatchControls:** on “Start Match” click, call controller `start` with selected models and rounds. Disable button while `initializing`.
- **MatchBoard:** consumes `board.cells`, highlights winning lines, listens for `state.phase === 'complete'`.
- **MatchMoveLog:** subscribe to controller events to replace mock data with live entries `{ round, turn, player, moveNumber, rationale, durationMs, wasValid }`.
- **MatchTelemetry:** consume controller timers (turn duration, streaks, remaining rounds), replacing the placeholder provider with real-time updates from the controller.
- **Leaderboard / Persistence:** consider emitting match summary once complete for storage or UI updates.
- **Toast/Errors:** unify with existing toast system for Gemini availability issues, invalid AI responses, or aborted matches.

## AI Prompt Contract
- For each turn:
  - Build prompt with ASCII board, mark legend, and turn metadata. Example intro for 3×3:  
    `You are playing tic-tac-toe. Three in a row horizontally, vertically, or diagonally wins.`
  - Request JSON output using the built-in AI response format (see `docs/built-in-ai-README.md`) with schema:  
    ```json
    {
      "nextMove": 1,
      "rationale": "Explain reasoning here"
    }
    ```
  - Validate `nextMove` against board empties (1–`size*size`). If invalid, mark the move entry with `wasValid = false`, capture raw output, and attempt a retry with corrective instructions.
- Track inference timing by capturing `performance.now()` before/after the model call and logging `durationMs` alongside the move.
- Cache Gemini sessions (`ensureGeminiChatModel`) so downloads happen once; handle `GeminiPermissionError` by surfacing CTA to click.

## Multi-Round Flow
1. Initialize controller with total rounds and models.
2. For each round:
   - Reset `BoardState`.
   - Determine starting player (alternate or randomize).
   - Run turn loop until win/draw.
   - Record summary (winner, moves, duration), update scoreboard.
3. After final round, emit `matchComplete` event with full telemetry.

## Open Questions / To-Do
- Turn timeout handling:
  - Default per-move deadline: 30 seconds (configurable via controller options).
  - If the active model exceeds the deadline, cancel the inference, record a timeout entry, and mark the round as an immediate loss for that model.
  - Persist timeout metadata alongside the move log (`wasValid = false`, `rationale = 'Timed out after 30s'`, `durationMs = deadline`).
- Skip deterministic seeding concerns—even identical models can run with default stochastic settings; focus on observing real-world behavior.
- Multi-model roadmap: future local providers (non-Gemini) will be supported, but initial controller implementation can focus on Gemini-specific quirks.

## Persistence Requirements
- No manual overrides: all interactions are AI-driven.
- Append every AI move to an in-memory match log with `{ round, turn, player, moveNumber, rationale, wasValid, timestamp, durationMs }`.
- On match completion, POST the full history payload to the backend API (include match config, scores, per-round summaries).
- For invalid AI responses, capture the raw output and flag `wasValid = false` before triggering retry or abort logic.
- Existing schemas in `packages/schema` currently assume 3×3 boards (`boardState.length === 9`) and simple move payloads. We’ll likely need to extend or version these contracts to handle configurable board sizes, richer move telemetry, rationale text, and timing.
- After persisting the match, trigger a leaderboard refresh (frontend invalidation + backend already updates standings).
- Schema evolution guidelines:
  - Decide upfront whether to version endpoints or widen existing payloads to avoid mid-stream incompatibilities.
  - When schema updates land, update frontend types and backend validators in the same change so they never diverge.
  - Document interim assumptions or temporary gaps in this file so QA/backenders can track “to-do” items.

## Controller API Sketch
```ts
export type GameLoopPhase =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'betweenRounds'
  | 'completed'
  | 'error'

export interface MatchConfig {
  matchId?: number // optional until persisted
  modelAId: ModelId
  modelBId: ModelId
  boardSize: number // 3-5
  totalRounds: number
  startingPlayer: 'modelA' | 'modelB' | 'alternate'
  moveTimeoutMs?: number // default 30000
}

export interface MoveLogEntry {
  round: number
  turn: number
  actor: 'modelA' | 'modelB'
  moveNumber: number // 1-based cell index as surfaced to UI
  rationale: string
  wasValid: boolean
  durationMs: number
  rawResponse?: unknown
  timestamp: number
  timeout?: boolean
}

export interface RoundSummary {
  round: number
  winner: 'modelA' | 'modelB' | 'tie'
  totalMoves: number
  durationMs: number
  boardSnapshot: string // ASCII
}

export interface GameLoopState {
  phase: GameLoopPhase
  currentRound: number
  totalRounds: number
  activePlayer: 'modelA' | 'modelB' | null
  board: BoardState
  score: { modelA: number; modelB: number; ties: number }
  moveHistory: MoveLogEntry[]
  roundSummaries: RoundSummary[]
  lastError?: string
}

export type GameLoopEvent =
  | { type: 'phase:change'; phase: GameLoopPhase }
  | { type: 'board:update'; board: BoardState }
  | { type: 'move:recorded'; entry: MoveLogEntry }
  | { type: 'round:complete'; summary: RoundSummary }
  | { type: 'match:complete'; summaries: RoundSummary[]; score: GameLoopState['score'] }
  | { type: 'error'; message: string }

export interface GameLoopController {
  getState(): GameLoopState
  subscribe(listener: (state: GameLoopState, event?: GameLoopEvent) => void): () => void
  configure(config: MatchConfig): void
  start(): Promise<void>
  pause(): void
  resume(): void
  abort(reason?: string): void
  nextRound(): void // manual advance if needed after pause/error
  dispose(): void // cleanup timers, listeners
}
```

### Notes
- `BoardState` remains mutable; the controller should clone or expose immutable snapshots when notifying listeners.
- `subscribe` returns an unsubscribe function so telemetry/move log components can register listeners without leaks.
- `configure` accepts the latest `MatchConfig` before `start`; `MatchControls` can call it whenever options change.
- `start` triggers `initializing` (model readiness, backend session creation) and transitions to `running`.
- `pause/resume` are primarily for future use (e.g., debugging); they can no-op initially but keep API surface stable.
- `abort` records the reason, transitions to `error`, and ensures pending persistence is cancelled.
- `nextRound` allows manual progression if a round completes but we want a user gesture before continuing.
- `dispose` should clear timers (timeouts), cancel Gemini requests, and flush subscribers when the arena unmounts.

## Immediate Next Steps
1. Draft controller skeleton (`game-loop.ts`) with basic state machine and callbacks.
2. Integrate `BoardState` per round and wire move application.
3. Implement Gemini prompt helper returning validated moves.
4. Hook controller into a new React context so arena components subscribe.
5. Add Vitest specs mocking the model to cover win/draw flows and error handling.
