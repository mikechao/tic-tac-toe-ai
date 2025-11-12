# Plan: Connect Leaderboard to Real Backend Data with Summary Tables

## Overview

This plan outlines how to connect the frontend leaderboard component to real backend data, replacing the current demo data with live statistics calculated from actual match results. The approach uses summary tables for performance, updated immediately when new match results are ingested.

## Current State

- Frontend displays demo data from `apps/frontend/src/data/demo.leaderboard.ts`
- Backend receives match data via `POST /api/matches/complete` endpoint
- Match data stored in `matches` and `moves` tables
- No existing leaderboard API or real-time statistics

## Phase 1: Database Schema Updates

### 1.1 Add Leaderboard Summary Tables

Add to `apps/backend/drizzle/schema.ts`:

#### `model_stats` table
```sql
CREATE TABLE model_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelId integer NOT NULL,
  modelVersion varchar(255) NOT NULL,
  totalMatches integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  ties integer NOT NULL DEFAULT 0,
  averageTurns decimal(5,2) NOT NULL DEFAULT 0.00,
  currentStreakType varchar(10) NOT NULL DEFAULT 'win' CHECK (currentStreakType IN ('win', 'loss', 'tie')),
  currentStreakLength integer NOT NULL DEFAULT 0,
  lastUpdatedAt timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE(modelId, modelVersion)
);

-- Indexes for performance
CREATE INDEX idx_model_stats_modelId ON model_stats(modelId);
CREATE INDEX idx_model_stats_updated ON model_stats(lastUpdatedAt);
```

#### `recent_matches` table
```sql
CREATE TABLE recent_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelId integer NOT NULL,
  modelVersion varchar(255) NOT NULL,
  matchId uuid NOT NULL,
  roundId uuid NOT NULL,
  result varchar(1) NOT NULL CHECK (result IN ('W', 'L', 'T')),
  opponentModelId integer,
  opponentModelVersion varchar(255),
  playedAt timestamptz NOT NULL,
  matchIndex integer NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE(modelId, modelVersion, matchIndex), -- Ensures one entry per index position
  UNIQUE(modelId, modelVersion, matchId)   -- Prevents duplicate match ingestion
);

-- Indexes for performance
CREATE INDEX idx_recent_matches_model ON recent_matches(modelId, modelVersion);
CREATE INDEX idx_recent_matches_playedAt ON recent_matches(playedAt DESC);
CREATE INDEX idx_recent_matches_match ON recent_matches(matchId, roundId);
```

### 1.2 Retention and Window Specifications

- **Recent matches retention**: Keep exactly 5 most recent matches per model version using indexed positions (1=most recent, 5=oldest)
- **Scope clarification**: Window is per (modelId, modelVersion) combination. Models with multiple versions maintain separate 5-match windows per version.
- **Index semantics**: Index 1 is always the most recent match, index 5 is the oldest. Indices are contiguous (no gaps).
- **Pruning procedure**: Atomic transaction with the following order:
  1. Delete record with matchIndex = 5 (oldest) if it exists
  2. Update records with matchIndex <= 4, incrementing their index by 1 (shifts 1→2, 2→3, 3→4, 4→5)
  3. Insert new match with matchIndex = 1 (most recent)
- **Duplicate handling**: Pre-insertion existence check prevents duplicate ingestion and preserves the exactly-5 window invariant
- **Transaction guarantees**: All three operations run in a single database transaction to prevent constraint violations and ensure consistency
- **Transaction boundary**: The recent_matches update is wrapped in the same transaction as the match ingestion (recordRoundResult), ensuring atomicity between match saving and leaderboard updates
- **Failure handling**: If any step fails, the entire transaction rolls back, leaving both the matches table and recent_matches table in their original state
- **Data cleanup**: No automatic cleanup needed for model_stats (keep all time)
- **Window sizing**: Recent form always shows last 5 games, no configuration needed

### 1.3 Update Schema Types

- Move `DemoLeaderboardEntry` and related types from `apps/frontend/src/data/demo.leaderboard.ts` to `packages/schema/src/index.ts`
- Rename to `LeaderboardEntry` (remove "Demo" prefix)
- Add Zod schemas for new database tables and API responses

#### Enum Definitions (add to `packages/schema/src/index.ts`)
```typescript
// Database storage types (actual persisted values)
export const dbMatchOutcomeSchema = z.enum(['win', 'draw']) // Only values stored in matches.outcome
export const recentResultSchema = z.enum(['W', 'L', 'T']) // Values stored in recent_matches.result

// API and business logic types (derived values)
export const matchResultSchema = z.enum(['win', 'loss', 'draw']) // Full set for API responses
export const streakTypeSchema = z.enum(['win', 'loss', 'tie'])

// Type exports
export type DbMatchOutcome = z.infer<typeof dbMatchOutcomeSchema>
export type RecentResult = z.infer<typeof recentResultSchema>
export type MatchResult = z.infer<typeof matchResultSchema> // API response type
export type StreakType = z.infer<typeof streakTypeSchema>

// Database table schemas
export const modelStatsSchema = z.object({
  id: z.string().uuid(),
  modelId: z.number().int(),
  modelVersion: z.string().min(1),
  totalMatches: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  averageTurns: z.number().min(0),
  currentStreakType: streakTypeSchema,
  currentStreakLength: z.number().int().min(0),
  lastUpdatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

export const recentMatchesSchema = z.object({
  id: z.string().uuid(),
  modelId: z.number().int(),
  modelVersion: z.string().min(1),
  matchId: z.string().uuid(),
  roundId: z.string().uuid(),
  result: recentResultSchema,
  opponentModelId: z.number().int().nullable(),
  opponentModelVersion: z.string().nullable(),
  playedAt: z.string().datetime(),
  matchIndex: z.number().int().positive(),
  createdAt: z.string().datetime(),
})

// API response schemas
export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive().nullable(),
  modelId: z.number().int(),
  matches: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  averageTurns: z.number().min(0),
  winRate: z.number().min(0).max(1),
  streak: z.object({
    type: streakTypeSchema,
    length: z.number().int().min(0),
  }),
  recentForm: z.array(recentResultSchema).max(5), // Up to 5 entries (pad for new models),
  lastMatchup: z.object({
    opponentId: z.number().int().nullable(), // Nullable for models with no opponents yet
    result: recentResultSchema.nullable(), // Nullable when no opponent exists
    playedAt: z.string().datetime().nullable(), // Nullable when no opponent exists
  }).nullable(), // Entire object nullable for models with no match history
})

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  lastUpdated: z.string().datetime(),
  totalModels: z.number().int().min(0),
})

// Type exports for schemas
export type ModelStats = z.infer<typeof modelStatsSchema>
export type RecentMatches = z.infer<typeof recentMatchesSchema>
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>

// Runtime validation helpers
export function assertValidDbMatchOutcome(value: unknown): asserts value is DbMatchOutcome {
  dbMatchOutcomeSchema.parse(value)
}

export function isValidDbMatchOutcome(value: unknown): value is DbMatchOutcome {
  return dbMatchOutcomeSchema.safeParse(value).success
}
```

**Schema vs Storage Clarification**:
- **Database layer**: Uses `DbMatchOutcome` ('win'|'draw') for matches.outcome column
- **Recent matches**: Stores `RecentResult` ('W'|'L'|'T') from perspective-based calculations
- **API layer**: Uses `MatchResult` ('win'|'loss'|'draw') for complete API responses
- **Type safety**: Runtime validation prevents persisting invalid 'loss' values to database
- **Conversion path**: Database storage (DbMatchOutcome) → Perspective calc (RecentResult) → API synthesis (MatchResult)

## Phase 2: Shared Logic and Contracts

### 2.1 Shared Result Mapping Logic (add to `packages/schema/src/result-mapping.ts`)

**Contract**: All conversion functions are pure, deterministic, and handle all enum values. No unused parameters.

```typescript
/**
 * Convert match outcome to recent form result from model's perspective
 * @param modelPerspective - Which player the model was in this match
 * @param winnerSlot - Which player won the match ('player1'|'player2'|'draw')
 * @returns 'W'|'L'|'T' for UI display
 */
export function mapMatchToRecentResult(
  modelPerspective: 'player1' | 'player2',
  winnerSlot: 'player1' | 'player2' | 'draw'
): RecentResult {
  if (winnerSlot === 'draw') return 'T'

  const modelWon = (modelPerspective === 'player1' && winnerSlot === 'player1') ||
                   (modelPerspective === 'player2' && winnerSlot === 'player2')

  return modelWon ? 'W' : 'L'
}

/**
 * Convert recent form result back to database match outcome
 * @param recentResult - 'W'|'L'|'T' from UI perspective
 * @param modelPerspective - Which player the model was in this match
 * @returns Complete database record with validated DbMatchOutcome
 */
export function mapRecentResultToMatchOutcome(
  recentResult: RecentResult,
  modelPerspective: 'player1' | 'player2'
): {
  outcome: DbMatchOutcome // Only 'win'|'draw' - validated type
  winnerSlot: 'player1' | 'player2' | 'draw'
} {
  switch (recentResult) {
    case 'W': return {
      outcome: 'win', // All completed matches store 'win' in outcome column
      winnerSlot: modelPerspective === 'player1' ? 'player1' : 'player2'
    }
    case 'L': return {
      outcome: 'win', // All completed matches store 'win' in outcome column
      winnerSlot: modelPerspective === 'player1' ? 'player2' : 'player1'
    }
    case 'T': return {
      outcome: 'draw', // Only ties store 'draw' in outcome column
      winnerSlot: 'draw'
    }
  }
}

/**
 * Convert database match outcome to streak type for business logic
 * @param dbOutcome - Database outcome ('win'|'draw')
 * @returns Streak type ('win'|'loss'|'tie')
 */
export function mapDbOutcomeToStreakType(dbOutcome: DbMatchOutcome): StreakType {
  return dbOutcome === 'draw' ? 'tie' : 'win' // Database never stores 'loss'
}

/**
 * Convert recent result to streak type for business logic
 * @param recentResult - 'W'|'L'|'T' from UI
 * @returns Streak type ('win'|'loss'|'tie')
 */
export function mapRecentResultToStreakType(recentResult: RecentResult): StreakType {
  switch (recentResult) {
    case 'W': return 'win'
    case 'L': return 'loss'
    case 'T': return 'tie'
  }
}

/**
 * Get inverse result for opponent calculations
 * @param result - Current model's result
 * @returns Opponent's result
 */
export function getOpponentResult(result: RecentResult): RecentResult {
  switch (result) {
    case 'W': return 'L'
    case 'L': return 'W'
    case 'T': return 'T'
  }
}

/**
 * Convert recent form result to MatchResult from model's perspective for API responses
 * This function synthesizes 'loss' values that don't exist in database storage
 * @param recentResult - 'W'|'L'|'T' from stored recent_matches table
 * @returns MatchResult ('win'|'loss'|'draw') from the model's perspective
 */
export function mapRecentResultToMatchResult(recentResult: RecentResult): MatchResult {
  switch (recentResult) {
    case 'W': return 'win'
    case 'L': return 'loss'
    case 'T': return 'draw'
  }
}
```

### 2.2 Ranking Formula (add to `packages/schema/src/ranking.ts`)
```typescript
export interface RankingMetrics {
  winRate: number
  totalMatches: number
  averageTurns: number
}

export function calculateRank(
  metrics: RankingMetrics,
  minMatchesThreshold: number = 5
): number {
  // Primary: Win rate (weighted 70%)
  // Secondary: Total matches (weighted 20%) - rewards more games
  // Tertiary: Average turns (weighted 10%) - lower is better (efficiency)

  if (metrics.totalMatches < minMatchesThreshold) {
    return -1 // Not enough matches to rank
  }

  const winRateScore = metrics.winRate * 0.7
  const volumeScore = Math.min(metrics.totalMatches / 100, 1) * 0.2 // Cap at 100 matches
  const efficiencyScore = Math.max(0, (9 - metrics.averageTurns) / 9) * 0.1 // Lower turns better

  return winRateScore + volumeScore + efficiencyScore
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const MIN_MATCHES_THRESHOLD = 5

  // Separate ranked and unranked entries
  const rankedEntries = entries.filter(entry => entry.matches >= MIN_MATCHES_THRESHOLD)
  const unrankedEntries = entries.filter(entry => entry.matches < MIN_MATCHES_THRESHOLD)

  // Sort ranked entries
  const sortedRanked = rankedEntries
    .sort((a, b) => {
      const scoreA = calculateRank({ winRate: a.winRate, totalMatches: a.matches, averageTurns: a.averageTurns }, MIN_MATCHES_THRESHOLD)
      const scoreB = calculateRank({ winRate: b.winRate, totalMatches: b.matches, averageTurns: b.averageTurns }, MIN_MATCHES_THRESHOLD)

      if (scoreB !== scoreA) return scoreB - scoreA // Higher score wins

      // Tie-breaker 1: Higher win rate
      if (b.winRate !== a.winRate) return b.winRate - a.winRate

      // Tie-breaker 2: More matches
      if (b.matches !== a.matches) return b.matches - a.matches

      // Tie-breaker 3: Lower average turns (more efficient)
      return a.averageTurns - b.averageTurns
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // Mark unranked entries with rank: null
  const markedUnranked = unrankedEntries.map(entry => ({ ...entry, rank: null }))

  // Combine: ranked entries first, then unranked entries
  return [...sortedRanked, ...markedUnranked]
}

// API Response: Returns all entries, ranked entries have rank numbers, unranked entries have rank: null
// Frontend: Display ranked entries in main leaderboard, optionally show unranked entries in separate section
```

## Phase 3: Shared Model Registry

### 3.1 Create Shared Model Registry

Add `packages/schema/src/model-registry.ts`:

- Map current model names to `ModelId` numbers:
  - "Gemini Nano" → 1
  - "SmolLM2" → 2
- Design to be easily extensible for future models
- Handle unknown/unregistered models gracefully
- Export functions for both frontend and backend use

This ensures consistent model identification across both applications.

## Phase 4: Backend Services

### 4.1 Create Leaderboard Update Service

Add `apps/backend/src/services/leaderboard-updater.ts`:

#### Update Model Stats Logic:
```typescript
// Extract model version for each participant based on their position
function getModelVersion(match: Match, isPlayer1: boolean): string {
  if (isPlayer1) {
    return match.playerOneModel || match.aiModelVersion // fallback to aiModelVersion for human matches
  } else {
    return match.playerTwoModel || match.aiModelVersion // fallback to aiModelVersion for human matches
  }
}

// For each new match, update both players' stats
async function updateModelStats(match: Match, modelId: number, isPlayer1: boolean): Promise<void> {
  const result = mapMatchToRecentResult(isPlayer1 ? 'player1' : 'player2', match.winner)
  const isWin = result === 'W'
  const isLoss = result === 'L'
  const isTie = result === 'T'

  // Get move count for this round
  const moveCount = await getMoveCountForRound(match.roundId)

  // Extract the correct model version for this participant
  const modelVersion = getModelVersion(match, isPlayer1)

  // Update existing stats or create new
  await db.insert(modelStats).values({
    modelId,
    modelVersion,
    totalMatches: 1,
    wins: isWin ? 1 : 0,
    losses: isLoss ? 1 : 0,
    ties: isTie ? 1 : 0,
    averageTurns: moveCount,
    currentStreakType: isWin ? 'win' : isLoss ? 'loss' : 'tie',
    currentStreakLength: 1,
  }).onConflictDoUpdate({
    target: [modelStats.modelId, modelStats.modelVersion],
    set: {
      totalMatches: sql`${modelStats.totalMatches} + 1`,
      wins: sql`${modelStats.wins} + ${isWin ? 1 : 0}`,
      losses: sql`${modelStats.losses} + ${isLoss ? 1 : 0}`,
      ties: sql`${modelStats.ties} + ${isTie ? 1 : 0}`,
      averageTurns: sql`ROUND((${modelStats.averageTurns} * ${modelStats.totalMatches} + ${moveCount}) / (${modelStats.totalMatches} + 1), 2)`,
      lastUpdatedAt: new Date(),
    }
  })

  // Update streaks in separate query
  await updateStreaks(modelId, modelVersion, result)
}

#### Update Recent Matches Logic:
```typescript
async function updateRecentMatches(match: Match, modelId: number, opponentId: number | null): Promise<void> {
  // Check if this match already exists to avoid unnecessary window operations
  const existingMatch = await db.query.recentMatches.findFirst({
    where: and(
      eq(recentMatches.modelId, modelId),
      eq(recentMatches.modelVersion, match.aiModelVersion),
      eq(recentMatches.matchId, match.matchId)
    )
  })

  // If match already exists, do nothing to preserve the exactly-5 invariant
  if (existingMatch) {
    return
  }

  // Only proceed with window operations if this is a new match
  // Remove oldest match if we already have 5 (prevents unique constraint violation)
  await db.delete(recentMatches)
    .where(and(
      eq(recentMatches.modelId, modelId),
      eq(recentMatches.modelVersion, match.aiModelVersion),
      eq(recentMatches.matchIndex, 5)
    ))

  // Shift existing matches down (make room for new one at index 1)
  await db.update(recentMatches)
    .set({ matchIndex: sql`${recentMatches.matchIndex} + 1` })
    .where(and(
      eq(recentMatches.modelId, modelId),
      eq(recentMatches.modelVersion, match.aiModelVersion),
      lte(recentMatches.matchIndex, 4) // Shift indices 1-4 to 2-5
    ))

  // Insert new match as index 1 (most recent)
  const result = mapMatchToRecentResult(
    modelId === getModelIdFromMatch(match, 'player1') ? 'player1' : 'player2',
    match.winner
  )

  await db.insert(recentMatches).values({
    modelId,
    modelVersion: getModelVersion(match, modelId === getModelIdFromMatch(match, 'player1')),
    matchId: match.matchId,
    roundId: match.roundId,
    result,
    opponentModelId: opponentId,
    opponentModelVersion: opponentId ? getOpponentModelVersion(match, opponentId) : null,
    playedAt: match.finishedAt,
    matchIndex: 1,
  }) // No conflict handling needed since we checked existence first
}
```

- `updateStreaks(newMatch, modelId)` - Calculate current win/loss/tie streak
- `getLastMatchup(modelId)` - Update last matchup information

### 4.2 Create Leaderboard Query Service

Add `apps/backend/src/services/leaderboard.ts`:

- Simple queries to fetch pre-calculated data from summary tables
- Transform database results to frontend-expected format
- Join with recent matches for last matchup details
- Use shared `sortLeaderboardEntries` function for ranking

### 4.3 Integrate with Match Ingestion

Modify `apps/backend/src/services/match-ingestion.ts`:

- Extend the existing database transaction in `recordRoundResult` to include leaderboard updates
- After successfully saving match data, call leaderboard update functions within the same transaction
- Use shared model registry to identify which models need updates
- Handle both players in a match (update stats for both AI models if applicable)
- Transaction structure: `matches.insert` → `moves.insert` → `leaderboard updates` → commit
- If any leaderboard update fails, the entire transaction rolls back (match + leaderboard)

## Phase 5: Backend API

### 5.1 Add Leaderboard Endpoint

Extend `apps/backend/src/routes/api/router.ts`:

- Add `GET /api/leaderboard` endpoint
- Query summary tables directly (very fast!)
- Return data in format expected by frontend components
- Follow existing error handling patterns
- No filtering parameters for now (can be added later)

## Phase 6: Frontend Integration

### 6.1 Create Leaderboard Data Service

Add `apps/frontend/src/services/leaderboard-service.ts`:

- Use existing `apiClient` pattern for consistency
- Integrate with TanStack Query for caching and state management
- Handle API errors gracefully
- Provide loading states

### 6.2 Update Leaderboard Route

Modify `apps/frontend/src/routes/leaderboard.tsx`:

- Replace `demoLeaderboardEntries` with real API data
- Add loading and error states
- Maintain existing UI structure and styling
- Use shared model registry for model information

### 6.3 Cleanup

- Remove `apps/frontend/src/components/leaderboard/LeaderboardFilters.tsx` (not needed currently)
- Clean up demo data files (can keep for reference/testing)

## Phase 7: Data Migration (Optional)

### 7.1 Backfill Existing Data

Create one-time script to:

- Process all existing match data in database
- Calculate summary statistics from historical matches
- Populate summary tables with current state
- Can be run after initial deployment if historical data is important

## Technical Benefits

**Performance**:
- Leaderboard queries become simple SELECTs from summary tables
- Query time stays constant regardless of match history size
- No complex aggregations needed for each request

**Freshness**:
- Stats updated immediately when new matches arrive
- No stale data or background sync delays

**Simplicity**:
- No background jobs or scheduled tasks needed
- Leverages existing match ingestion flow
- Updates happen in same transaction as match saving

**Consistency**:
- Model registry shared between frontend and backend
- Single source of truth for model identification
- Consistent data transformation logic

**Scalability**:
- Easy to add new models via model registry
- Summary table approach scales to millions of matches
- Minimal performance impact on match ingestion

## Trade-offs

**Slightly longer match ingestion**: Adding leaderboard updates will make match saving take a bit longer, but this is acceptable for instant leaderboard updates.

**Additional storage**: Summary tables require extra storage, but this is minimal compared to the performance benefits.

## Future Enhancements

- Add filtering capabilities (time ranges, model families)
- Real-time leaderboard updates via WebSockets
- Historical leaderboard data and trends
- More detailed statistics and analytics