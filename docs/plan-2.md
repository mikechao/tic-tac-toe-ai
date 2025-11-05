# Arena Game Loop Implementation Plan

## Preparation & Design
- [ ] Review `src/lib/game/board-state.ts` and `docs/game-loop.md` to confirm state transitions, mutability expectations, and available helpers.
- [ ] Audit `components/arena/*`, `MatchControls`, and existing context providers to document how match payloads and UI updates currently flow.
- [ ] Define the phases and events for the controller state machine (`idle`, `initializing`, `running`, `betweenRounds`, `completed`, `error`) and capture invariants for each.
- [ ] Decide whether to implement the state machine manually or scaffold an abstraction (e.g., enum-driven reducer) that can later be replaced by `xstate`.

## Controller Skeleton
- [ ] Create `src/lib/game/game-loop.ts` exporting `createGameLoopController(config)` with typed interfaces for `GameLoopPhase`, `MatchConfig`, `MoveLogEntry`, `RoundSummary`, `GameLoopState`, and `GameLoopEvent`.
- [ ] Implement internal storage for controller state, subscriber management, and lifecycle methods (`getState`, `subscribe`, `configure`, `start`, `pause`, `resume`, `abort`, `nextRound`, `dispose`).
- [ ] Ensure `subscribe` returns an unsubscribe callback and immediately replays the current state to new listeners for UI hydration.
- [ ] Add guardrails so `configure` rejects invalid payloads (missing models, rounds ≤ 0, unsupported board sizes) and routes errors to the toast system.

## Session & Round Management
- [ ] Initialize per-round `BoardState` instances on `start`, track cumulative score, and cache Gemini session handles for both models.
- [ ] Implement round lifecycle helpers: reset board, determine starting player (alternate/randomized options), and transition to `running` phase.
- [ ] After each move, evaluate outcomes via `checkWinner`/`isDraw`, aggregate telemetry, and queue transitions to `betweenRounds` or `completed`.
- [ ] Provide a `nextRound` handler that safely advances state when invoked manually after pauses or errors.

## Turn Engine & AI Integration
- [ ] Serialize the board with `toAscii()` and assemble the AI prompt contract (intro text, schema reminder, contextual metadata) for each turn.
- [ ] Call Gemini via `ensureGeminiChatModel`, validating JSON responses against empty-cell indexes, and retry with corrective instructions when needed.
- [ ] Capture timing metrics using `performance.now()`, storing `durationMs`, `wasValid`, and raw responses on each `MoveLogEntry`.
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
