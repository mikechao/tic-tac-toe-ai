# Arena Game Loop Implementation Plan

## Preparation & Design
- [x] Review `src/lib/game/board-state.ts` and `docs/game-loop.md` to confirm state transitions, mutability expectations, and available helpers.
- [x] Audit `components/arena/*`, `MatchControls`, and existing context providers to document how match payloads and UI updates currently flow.
- [x] Define the phases and events for the controller state machine (`idle`, `initializing`, `running`, `betweenRounds`, `completed`, `error`) and capture invariants for each.
- [x] Decide whether to implement the state machine manually or scaffold an abstraction (e.g., enum-driven reducer) that can later be replaced by `xstate`.

## Controller Skeleton
- [x] Create `src/lib/game/game-loop.ts` exporting `createGameLoopController(config)` with typed interfaces for `GameLoopPhase`, `MatchConfig`, `MoveLogEntry`, `RoundSummary`, `GameLoopState`, and `GameLoopEvent`.
- [x] Implement internal storage for controller state, subscriber management, and lifecycle methods (`getState`, `subscribe`, `configure`, `start`, `pause`, `resume`, `abort`, `nextRound`, `dispose`).
- [x] Ensure `subscribe` returns an unsubscribe callback and immediately replays the current state to new listeners for UI hydration.
- [x] Add guardrails so `configure` rejects invalid payloads (missing models, rounds ≤ 0, unsupported board sizes) and routes errors to the toast system.

## Session & Round Management
- [x] Initialize per-round `BoardState` instances on `start`, track cumulative score, and cache Gemini session handles for both models.
- [x] Implement round lifecycle helpers: reset board, determine starting player (alternate/randomized options), and transition to `running` phase.
- [x] After each move, evaluate outcomes via `checkWinner`/`isDraw`, aggregate telemetry, and queue transitions to `betweenRounds` or `completed`.
- [x] Provide a `nextRound` handler that safely advances state when invoked manually after pauses or errors.

## Turn Engine & AI Integration
- [x] Serialize the board with `toAscii()` and assemble the AI prompt contract (intro text, schema reminder, contextual metadata) for each turn.
- [x] Call Gemini via `ensureGeminiChatModel`, validating JSON responses against empty-cell indexes, and retry with corrective instructions when needed.
- [x] Capture timing metrics using `performance.now()`, storing `durationMs`, `wasValid`, and raw responses on each `MoveLogEntry`.
- [ ] Enforce per-move timeout logic (default 30s), cancelling late inferences, marking the active model’s turn as a forfeit, and surfacing toast notifications.

## UI & Telemetry Broadcast
- [ ] Emit controller events (`phase:change`, `board:update`, `move:recorded`, `round:complete`, `match:complete`, `error`) and ensure observers receive immutable snapshots.
- [ ] Build or update a React context/hook (e.g., `useGameLoop`) that wires controller subscription into `MatchBoard`, `MatchTelemetry`, and `MatchMoveLog`.
- [ ] Replace placeholder data sources in arena components to consume live controller state (board cells, active player, countdowns, streaks, move log entries).
- [ ] Disable `MatchControls` actions during `initializing`/`running` phases and re-enable them after `completed` or `error` states.

## Persistence & Analytics
- [ ] Maintain an in-memory match log capturing `{ round, turn, player, moveNumber, rationale, wasValid, durationMs, rawResponse, timestamp, timeout }` for every AI move.
- [ ] On match completion, POST telemetry (config, scores, per-round summaries) to the backend API and trigger leaderboard cache invalidation.
- [ ] Document and coordinate any required schema extensions in `packages/schema` to support variable board sizes and richer telemetry payloads.

## Testing & QA
- [ ] Add Vitest coverage for win, draw, invalid-move, timeout, abort, and retry flows using mocked Gemini responses.
- [ ] Create integration-style tests ensuring round transitions and score tracking behave correctly across multi-round matches.
- [ ] Validate that pausing, resuming, and aborting clean up timers and subscriptions via `dispose` during component unmount.
- [ ] Document known gaps, open questions (e.g., deterministic seeding, multi-model roadmap), and follow-up tasks back into `docs/game-loop.md` or project tracking.

### 2025-11-05 BoardState/Game Loop Review
- `BoardState` is a mutable class: `applyMove`, `reset`, and internal `cells` updates mutate the instance, so controller broadcasts must clone (`[...board.getCells()]` or `board.getCells().slice()`) before exposing snapshots.
- Size guardrails are fixed at 3–5 with `winLength` locked to the selected size, so victory still requires a full-line match on larger boards; no partial streak detection is available yet.
- Turn flow helpers include `currentPlayer` (auto-flips after `applyMove`), `moveCount`, `getValidMoves`, `isValidMove`, `checkWinner`, `isDraw`, plus coordinate/index helpers (`toIndex`, `fromIndex`) and ASCII serialization via `toAscii(includeMeta?)` for prompt construction.
- `getCells()` returns the backing array typed as `readonly`, but mutating operations still affect it; treat emitted board snapshots as read-only copies to honor doc guidance about immutable broadcasts.
- `docs/game-loop.md` expects controller phases `idle → initializing → running → betweenRounds → completed → error`, with BoardState reset per round and telemetry-driven events (`phase:change`, `board:update`, etc.), aligning with available helpers above.

### 2025-11-05 Arena Components Audit
- `MatchBoard` renders entirely from static `demoBoardState`/`demoScore`; it only uses live `match` data to resolve model names via `demoModels`, so controller broadcasts must replace those placeholders with props derived from real board snapshots, active player, and score progress.
- `MatchControls` keeps local state for both model IDs and rounds, but `availableModels` filters to a single Gemini entry, allowing duplicates; `handleStartMatch` just raises toast notifications without emitting configuration to any store—future integration needs to bridge this to the game loop controller and enforce distinct model selection if required.
- `MatchMoveLog` builds its list from static `mockMoves`, with auto-scroll logic gated by `match` truthiness; it expects `{ modelKey, coordinate, rationale, timestamp }` fields, so the controller should emit normalized move entries and provide streaming updates to replace the mock list.
- `MatchTelemetry` also depends on a hard-coded `mockTelemetry` object; countdowns, streaks, and last-move data need to flow from controller state, and accent colors currently key off `mockTelemetry.activeModel` instead of real turn ownership.
- Shared dependencies (`demoModels`, `useToast`, `useGeminiContext`) are local conveniences—no existing context provides match state today. The upcoming controller should expose configuration setters and state subscriptions so arena components can unsubscribe from mocks and render immutable snapshots in line with broadcast expectations.

### 2025-11-05 Controller Phases & Events
- `idle` invariant: no active match config, zero timers/models warmed; controller exposes empty move history and `activePlayer = null`. Entered on creation and after `dispose`, only exits via `configure` + `start`.
- `initializing` invariant: match config locked, Gemini sessions/BoardState instances provisioning; no moves allowed, subscribers get immutable snapshot with `board` reset and `phase:change` event queued. Errors here map to `error` with `lastError` populated.
- `running` invariant: exactly one `BoardState` is current with `activePlayer` set, timers live, and moves flowing; emits `board:update` and `move:recorded` events. Transition only via win/draw (`betweenRounds`/`completed`), manual `pause`, `abort`, or timeout.
- `betweenRounds` invariant: last round summary available, next round not yet started; `board` frozen until `nextRound` or auto-advance, and no timers counting down. Progression to `running` after board reset or to `completed` if final round done.
- `completed` invariant: all rounds resolved with final score and summaries sealed; controller rejects further moves, only allowing `start`/`configure` to reinitialize or `dispose`.
- `error` invariant: `lastError` holds message, timers cleared, and state locked until recovery action (`abort`→`idle`, manual `nextRound` if safe, or fresh `start`). Subscribers receive `error` event immediately.
- Primary events: `phase:change` (phase transitions), `board:update` (immutable board snapshot on each move/reset), `move:recorded` (normalized log entry), `round:complete` (per-round summary, emitted before `betweenRounds`), `match:complete` (final score after last round), `error` (fatal/handled issue). Future controller must ensure events always pair with monotonic state snapshots to avoid stale UI.

### 2025-11-05 State Machine Approach Decision
- Preferred path: ship an enum-driven reducer inside the controller (`useReducer`-style logic wrapped in plain TS) with a strongly typed `GameLoopTransitionMap`. This keeps the initial implementation lightweight while mimicking the event/state contracts we would configure in `xstate` later.
- Rationale: the controller only needs six phases and a handful of transitions, so a manual reducer avoids the bundle hit and learning curve of bringing in `xstate` immediately, yet keeps transition declarations centralized for future swaps.
- Migration guardrails: model reducer transitions as pure functions returning next `GameLoopState` + outgoing events; align event names/invariants with the `game-loop.md` spec so the map can be ported to `xstate` without rewriting arena consumers.
- Action item: encapsulate the reducer in `createGameLoopController`, expose helper methods (`transition('START')`, etc.), and document the correspondence to potential `xstate` states in `docs/game-loop.md` to ease future migration.

### 2025-11-05 Game Loop Skeleton
- Added `apps/frontend/src/lib/game/game-loop.ts` with the initial controller scaffold, including exported types (`GameLoopPhase`, `MatchConfig`, `MoveLogEntry`, `RoundSummary`, `GameLoopState`, `GameLoopEvent`).
- `createGameLoopController` currently wires up state storage, subscription management, and stubbed lifecycle methods that throw until implemented; `dispose` resets to the default state and notifies listeners.
- The initial state seeds a fresh `BoardState` and empty histories, giving us a concrete target for reducer integration and event emission in upcoming tasks.

### 2025-11-05 Controller State Management
- Replaced lifecycle stubs with a reducer-style dispatch system and transition map that persists match config, phases, and listeners in closure scope.
- `configure` now seeds a fresh `BoardState`, resets score/history, and broadcasts a `board:update` snapshot; `start` transitions through `initializing` into the first `running` round via `BEGIN_ROUND` actions.
- Added support for `pause`/`resume` (`isPaused` flag), `abort` (moves to `error` and emits notifications), `nextRound` (advances via `BEGIN_ROUND` while respecting total rounds), and `dispose` (clears listeners and config before resetting to `idle`).
- Subscriber notifications always replay the latest state first, then emit any transition-specific events (`phase:change`, `board:update`, `error`) to keep downstream observers in sync.

### 2025-11-05 Subscription Hydration
- Verified `subscribe` hydrates listeners immediately by invoking the listener with the current state upon registration before returning the unsubscribe closure.
- Unsubscribe simply removes the listener from the internal `Set`, ensuring no further notifications after disposal while the controller retains other observers.

### 2025-11-05 Configure Guardrails
- `configure` now validates the incoming payload: total rounds must be >0, board size locked to 3–5, and models must differ; invalid configs throw before mutating controller state.
- These checks will surface through UI toast handling once `MatchControls` bridges into the controller, preventing matches from starting with unsupported settings.

### 2025-11-05 Round Initialization & Sessions
- `start` now prebuilds per-round `BoardState` instances (respecting alternating starters) and keeps them in `state.roundBoards`, resetting the proper board whenever a round begins.
- First-round setup stays in `initializing` until optional model sessions load; once ready, `BEGIN_ROUND` promotes the phase to `running` and reuses the prebuilt board snapshot.
- Optional `loadModelSession` dependency primes Gemini (or other) chat sessions for unique model IDs and caches the handles in the controller closure for reuse across matches.
- Score tracking infrastructure remains (`state.score`) and will increment during the upcoming outcome evaluation task; noted as a follow-up when we wire `checkWinner`/`isDraw` processing.

### 2025-11-05 Round Lifecycle Helpers
- Added `ADVANCE_TO_BETWEEN_ROUNDS` reducer action and `betweenRounds` phase handling so the controller pauses between rounds with `activePlayer = null` before starting the next round.
- `BEGIN_ROUND` now reuses/reset prebuilt `BoardState` instances, ensuring alternating starters (`determineStartingPlayer`) and cleared grids without reallocating arrays mid-match.
- Controller options accept an `onPhaseChange` callback that fires alongside subscriber events, giving higher-level contexts a hook for enabling/disabling UI (e.g., match controls during `initializing`).
- Further work noted: emit `round:complete` summaries and update scores once outcome evaluation is implemented in the next checklist item.

### 2025-11-05 Move Evaluation & Summaries
- Introduced `recordMove` on the controller, applying moves via `BoardState`, logging `MoveLogEntry`s, and updating `activePlayer` for the next turn when the round continues.
- Reducer now handles a `RECORD_MOVE` action that appends move history, emits `board:update`/`move:recorded`, and when a win/draw occurs, updates cumulative scores, stores a `RoundSummary`, and transitions to `betweenRounds` or `completed` with matching events.
- Round completion emits `round:complete` telemetry, and the final round also raises `match:complete` with the aggregated summaries/score for downstream persistence.
- Draw detection leverages `BoardState.checkWinner()`/`isDraw()`, ensuring ties increment the scoreboard and produce summaries with ASCII board snapshots for telemetry.

### 2025-11-05 Next Round Control
- `nextRound` now enforces that callers wait for the controller to enter `betweenRounds` before advancing and then dispatches `BEGIN_ROUND` with the next round index.
- This guard prevents accidental skips while the `running` phase is still resolving telemetry and ensures round queues stay in sync with the prebuilt `roundBoards` array.

### 2025-11-05 Board Serialization
- Added `getBoardAscii(includeMeta?)` to the controller so prompt builders can fetch the latest board snapshot using `BoardState.toAscii()` without mutating state.
- This helper keeps serialization logic in one place and aligns with the upcoming AI prompt contract work in the Turn Engine tasks.

### 2025-11-05 Gemini Move Inference
- Added `requestGeminiMove` helper under `src/lib/game/ai-turn.ts` which leverages `ensureGeminiChatModel` + `generateObject` to solicit structured `{ nextMove, rationale }` responses.
- The helper validates moves against the current board’s empty cells, retries (configurable) when responses target occupied cells, and returns typed success/failure results with raw output for telemetry.
- Prompt content includes board ASCII, round metadata, and mark ownership so future controller logic can wire it directly into the move engine.

### 2025-11-05 Move Timing Capture
- `requestGeminiMove` now records inference timing via `performance.now()`, returning `durationMs`, `startedAt`, and `finishedAt` on success (and surfacing timing data on invalid retries when available).
- These metrics will feed directly into `MoveLogEntry` duration tracking once we wire controller integration, satisfying the plan’s timing requirement before introducing timeout logic.
