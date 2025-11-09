# Backend platform plan

## Purpose

- Define how the Cloudflare Worker backend adopts Xata as the system of record and Hyperdrive as the acceleration layer
- Capture phased tasks so we can land schema, infrastructure, developer experience, and legacy-cleanup updates incrementally
- Highlight owner assignments, tooling, and open questions that need product or infra input

## Guiding principles

- Keep gameplay writes strongly consistent (single source of truth in Xata) while letting Hyperdrive absorb connection pooling and edge caching
- Maintain parity with the existing Drizzle ORM + Hono stack to minimize refactors
- Prefer reproducible automation (Wrangler/Turbo scripts, seed data, schema migrations) over manual console steps
- Treat Sentry as the source for telemetry/diagnostic breadcrumbs so backend tables focus on authoritative gameplay data only

## Current state snapshot

- Worker entry lives at `apps/backend/src/index.ts` with Env validation, Hono router, and Drizzle wiring
- Database access layer (`src/lib/db.ts` + `services/match-repository.ts`) assumes a Postgres-compatible connection string exposed as `DATABASE_URL`
- `drizzle.config.ts` already targets PostgreSQL and generates SQL files under `apps/backend/drizzle/migrations`
- Wrangler environments expect a single `DATABASE` binding pointing at Hyperdrive; `.dev.vars` mocks a local Postgres URL

## Target architecture (Xata + Hyperdrive)

1. **Primary data store**: Xata workspace with a production branch holding gameplay tables (`matches`, `moves`).
2. **Access path**: Cloudflare Hyperdrive connection pointing to the Xata Postgres endpoint; Workers talk to Hyperdrive using the existing `DATABASE` binding so Drizzle remains unchanged.
3. **Local development**: Xata branch `dev` cloned from production; seeded via `pnpm --filter backend db:seed`. Developers connect through Hyperdrive (dev binding) or directly via `psql`/Drizzle kit using Xata client credentials. For offline work, a Dockerized Postgres instance can stand in for Xata—Drizzle only needs a Postgres URL, so point `.dev.vars` at the container until you resync with the hosted branch.
4. **Analytics spillover**: Periodic exports from Xata (branch snapshots or `xata export`) into R2/Data Platform for long-term move logs once storage thresholds loom.

## Round recap ingestion flow

1. Frontend completes a round and opens the recap dialog.
2. When the user closes or confirms the dialog, the client POSTs a `RoundResult` payload (match metadata, ordered moves, winner, round counters, duration, and participant models) to `/api/matches/complete`.
3. Worker validates the payload via Zod, generates a `roundId` UUID, derives an idempotency key (hash of that `roundId` plus `playerOneModel`, `startedAt`, board size, and ordered moves) to avoid duplicate inserts, then writes to `matches` + `moves` in Xata through Hyperdrive.
4. Response returns the server-minted `matchId`, the counted moves, and the persistence timestamp so the UI can confirm the save before dismissing the recap dialog.
5. Sentry captures ancillary telemetry (latency, UI errors) separately; no telemetry rows are stored in the gameplay database.

### RoundResult contract (draft)

```ts
// Request body posted to /api/matches/complete
type RoundResult = {
  playerOneModel: string | null // e.g., 'human', 'gemini-nano-2'
  playerTwoModel: string | null // e.g., 'gemini-nano-2'
  matchId?: string // present after the first round of a multi-round session
  roundId?: string // optional client hint; backend overwrites with its own UUID
  boardSize: 3 | 4 | 5
  currentRound: number // 1-indexed round number within the match series
  totalRounds: number // number of rounds played in this match context
  difficulty?: 'easy' | 'medium' | 'hard'
  startedAt: string // ISO timestamp from client clock
  finishedAt: string // ISO timestamp from client clock
  durationMs: number
  outcome: 'win' | 'loss' | 'draw' // perspective of the human/active player
  winner: 'player1' | 'player2' | 'draw'
  moves: Array<{
    turnIndex: number // 0-based order
    cell: number // flattened index (0-8 for 3x3); single cell index is enough to reconstruct board state
    symbol: 'X' | 'O'
    elapsedMs: number // delta since previous move
  }>
  rematchRequested: boolean
}

// Response body from backend
type RoundResultResponse = {
  matchId: string
  roundId: string
  moveCount: number
  persistedAt: string // ISO timestamp from server
}
```

### `/api/matches/complete` endpoint spec

- **Method**: `POST`
- **Path**: `/api/matches/complete`
- **Headers**:
  - `Content-Type: application/json`
  - `X-App-Version` (optional) for rollout tracking
- **Auth**: none required yet; future JWT/bearer tokens can be added without changing the payload
- **Request body**: `RoundResult` JSON described above. `matchId` is omitted for the first round; once the backend returns it, clients must include `matchId` in subsequent submissions for the same match.
- **Response 200**: `RoundResultResponse` plus an `idempotent: boolean` flag indicating whether this save was newly persisted or deduped. Example:

```json
{
  "matchId": "9e2c1c07-7c6d-4c8e-a8b8-3d9ee8b1d8c1",
  "roundId": "1a2b3c4d-5678-90ab-cdef-1234567890ab",
  "moveCount": 7,
  "persistedAt": "2025-11-09T21:14:05.123Z",
  "idempotent": false
}
```

- **Response 400**: validation failure (missing fields, invalid enums, inconsistent winner/outcome). Body includes `message` and `fieldErrors` arrays from Zod.
- **Response 409**: reserved for future conflict scenarios (e.g., attempting to attach a round to a closed match); today duplicates simply return 200 with `idempotent: true`.
- **Idempotency**: backend hashes the server-minted `roundId`, `playerOneModel`, `startedAt`, board size, and ordered moves. Replays with the same combination short-circuit and return the original `matchId`/`roundId` without writing new rows.
- **Rate limiting**: handled by Cloudflare Worker defaults; add per-IP throttling later if abused.
- **Observability**: log `roundId`, `matchId`, board size, and `idempotent` flag for troubleshooting; send the same metadata to Sentry breadcrumbs when errors occur.

**Validation rules**

- `moves` array must be non-empty, ordered by `turnIndex`, and alternate symbols (unless outcome is `draw` due to full board)
- `finishedAt` must be >= `startedAt` and within 10 minutes of server receipt to avoid clock skew issues; otherwise server overwrites with Worker timestamp
- `currentRound` must be between 1 and `totalRounds`; `totalRounds` must be >= 1, otherwise the backend rejects the payload
- `matchId`, when provided, must be a UUID and correspond to an open match record; omit it for the first round so the backend can mint one
- Server mints UUID v4 identifiers for the match and each move; client payloads must not include IDs
- Server derives idempotency keys from the server-minted `roundId`, `playerOneModel`, `startedAt`, board size, and ordered moves; duplicates short-circuit with HTTP 200 and the original response payload
- `winner` must be `player1`, `player2`, or `draw`; backend cross-checks that it aligns with the `outcome` field for the reported perspective

**Frontend alignment**

- Single `cell` indices per move provide enough context to rebuild the board for debugging; no full board snapshots are needed
- Assistive actions (undo, hints) are out of scope today, so no extra fields beyond the base payload are required
- Backend is authoritative for ID generation; clients never send IDs and simply receive them in the response payload
- Frontend must include `playerOneModel`/`playerTwoModel` strings and `totalRounds` so the backend can persist match context (board variant + participant models); the backend infers matchup type purely from those identifiers
- Frontend supplies `currentRound` and `winner` so the backend can store leaderboard-friendly metadata without inferring from move order
- Backend always returns its own `roundId` so the UI can correlate retries; client-provided `roundId` values are treated as advisory only
- Backend returns a `matchId` on the first submission; the UI must persist it locally and include it in subsequent rounds so all recaps for a multi-round session stay linked

### Local Docker workflow (optional)

- Spin up Postgres via `docker compose up db` (or add a dedicated service in `docker-compose.yml` with exposed port 5432 and persistent volume)
- Seed schema using the same Drizzle migrations: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/tic_tac_toe pnpm --filter backend db:migrate`
- Point `.dev.vars` `DATABASE_URL` to the container for Worker emulation; switch back to Hyperdrive URL when testing hosted parity
- Use this mode for offline dev, large fixture imports, or when you want to iterate on migrations without touching shared Xata branches; remember to re-run against Xata dev before opening a PR

## Workstream breakdown

### 0. Gameplay ingestion API

- [x] Design the `/api/matches/complete` endpoint contract emitted by the round recap dialog
- [ ] Implement request validators + Drizzle repositories so the payload persists to `matches` + `moves`
- [ ] Add Vitest coverage for idempotent writes and failure modes (validation, DB errors)
- [ ] Document the frontend SDK helper that calls this endpoint and the retry/backoff rules

### 1. Xata provisioning

- [ ] Create Xata workspace + database (owner: Platform)
- [ ] Define base schema in Xata UI or via `xata init` aligned with Drizzle models (see Data model section)
- [ ] Generate API keys (server + dev) scoped per environment; store in 1Password
- [ ] Enable daily backups + 30-day PITR to cover rollback requirements

### 2. Hyperdrive setup

- [ ] For each environment (dev, staging, prod) create a Hyperdrive instance pointing at the respective Xata branch endpoint
- [ ] Configure caching strategy: disable for transactional POST/PUT routes, allow short TTL (5–10s) for leaderboard reads
- [ ] Update `wrangler.toml` bindings: `[[hyperdrive]] binding = "DATABASE"` with environment-specific `id`
- [ ] Rotate `.dev.vars` to include the dev Hyperdrive connection string so `wrangler dev` matches cloud routing

### 3. Legacy cleanup

- [x] Remove obsolete D1/PlanetScale wiring from `wrangler.toml`, Terraform (if any), and docs so only Hyperdrive/Xata remain referenced
- [x] Delete unused D1 scripts (`pnpm db:*` pointing at PlanetScale) or rewrite them to target Xata/Hyperdrive (verified `apps/backend/package.json` db scripts now invoke Drizzle against generic Postgres URLs)
- [x] Sweep `docs/`, `README.md`, and onboarding notes for stale instructions (e.g., D1 bindings, PlanetScale secrets) and update them to the new flow
- [x] Archive or migrate legacy data: export existing D1 tables, import them into Xata, and decommission the old database once verified (no legacy data existed)
- [x] Update `.dev.vars` and sample env files to remove D1 placeholders and add Docker + Hyperdrive examples

### 4. Schema + migrations

- [ ] Translate Xata tables into Drizzle schema files under `apps/backend/src/services/schemas.ts` (or equivalent)
- [ ] Run `pnpm --filter backend db:generate` to sync SQL migrations; commit generated files for traceability
- [ ] Seed reference data (AI models, starter accounts) via `db:seed` hitting Xata dev branch
- [ ] Establish migration workflow: only promote via CI (Turbo task) after tests + lint pass

### 5. Secrets & configuration

- [ ] Store Hyperdrive URLs as Wrangler secrets (`DATABASE_URL`) per environment
- [ ] Add `XATA_API_KEY` if we keep any direct branch admin tooling (CLI, migrations)
- [ ] Document onboarding steps in `docs/backend-architecture.md` (add section for Xata credentials, branching rules)

### 6. Observability & resilience

- [ ] Enable Hyperdrive metrics + alerts (connectivity errors, cache hit rate)
- [ ] Use Xata webhooks or scheduled checks to detect schema drift between branches
- [ ] Extend `services/logger.ts` to tag log lines with `xata_branch` & `hyperdrive_region` for faster incident debugging

### 7. Developer experience

- [ ] Provide `make/xata.sh` (or pnpm script) to pull latest schema, open the web UI, and fetch sample data
- [ ] Update onboarding docs with steps to clone production branch into personal sandboxes
- [ ] Create Vitest fixtures that spin up Prisma/Xata in-memory mocks or record/replay HTTP fixtures for deterministic tests


## Data model highlights

| Table | Key fields | Notes |
| --- | --- | --- |
| `matches` | See detailed table below | Stores per-round metadata including board size, participant models, timing, and recap hash |
| `moves` | `id`, `match_id`, `turn_index`, `cell`, `symbol`, `duration_ms` | Append-only child table for replay + analytics |

Leaderboards query directly against `matches` (e.g., aggregating win rate, streaks, per-difficulty stats) without a separate snapshot table; scheduled jobs can still cache computed rankings, but persistence lives in those core tables. If we later add user accounts, we can reintroduce a `players` table and backfill foreign keys from historical matches.

### `matches` table fields (authoritative list)

| Field | Type | Description |
| --- | --- | --- |
| `id` | uuid | Generated by the backend when `/api/matches/complete` succeeds |
| `round_id` | uuid | Server-minted identifier for correlating retries / idempotency |
| `player_one_model` | text | Model/agent name for slot 1 (e.g., `human`, `gemini-nano-2`) |
| `player_two_model` | text | Model/agent name for slot 2 |
| `opponent_type` | text | Derived from player model metadata (`player_two_model === 'human' ? 'human' : 'ai'`) |
| `difficulty` | text, nullable | Optional difficulty label surfaced by the frontend alongside model names |
| `board_size` | integer | 3, 4, or 5 representing board variant |
| `current_round` | integer | Round number represented by this payload (1-indexed) |
| `total_rounds` | integer | Number of rounds represented by this recap dialog submission |
| `started_at` | timestamptz | Parsed from payload; server clamps to receipt time if skewed |
| `finished_at` | timestamptz | Parsed from payload or server timestamp |
| `rematch_requested` | boolean | Whether the user tapped rematch in the recap dialog |
| `ai_model_version` | text, nullable | Derived from `playerOneModel`/`playerTwoModel` when they reference AI builds |
| `outcome` | text | `win`, `loss`, or `draw` from the human/active player's perspective |
| `winner_slot` | text | `player1`, `player2`, or `draw` (mirrors `winner` payload field) |
| `duration_ms` | integer | Total round duration (redundant but handy for analytics) |
| `recap_hash` | text | Hash used for idempotency (models/board/time/moves)

`moves` rows reference `matches.id` as a foreign key. Any future computed stats (streak, aggregate win count) should derive from these base tables rather than storing denormalized columns unless we prove we need them.

## Deployment flow updates

1. Local dev uses `pnpm --filter backend dev` with `.dev.vars` pointing to dev Hyperdrive.
2. CI runs migrations against a temporary Xata branch (created via CLI), executes Vitest + lint, then promotes schema to staging.
3. Production deploy runs `wrangler publish --env production`; Hyperdrive routes traffic to Xata prod branch with cache priming cron job for leaderboard endpoints.

## Risks & mitigations

- **Xata region latency**: choose region close to primary players; if not on Cloudflare POP, rely on Hyperdrive caching for reads. Monitor p95 latencies via Wrangler logs.
- **Connection limits**: Hyperdrive pools connections, but Xata still enforces per-workspace limits—set alerts when Active Connections > 70% of quota.
- **Storage growth**: raw move logs may exceed Xata plan; schedule weekly exports to R2 and prune archival tables after verification.
- **Schema drift between branches**: enforce migrations-only changes; disable manual edits in production branch except via PR pipeline.

## Open questions

1. Do we need multi-region Xata branches (e.g., EU data residency) for compliance, or is a single US region acceptable?
2. What cache TTL balances fresh leaderboard updates with Hyperdrive read hit rates?
3. Are we comfortable granting the Worker full `server` API keys, or do we need scoped personal keys + token rotation automation?

Let me know which of these need clarification so we can refine the plan before implementation.
