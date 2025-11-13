# Drizzle Migration Issues Analysis

## Overview

During the model version cleanup process, we encountered several issues with Drizzle Kit's migration system. This document catalogs the problems encountered and provides workarounds for future development.

## Issue Summary

### 1. Migration Generation Failure

**Command:**
```bash
pnpm --filter backend db:generate
```

**Error:**
```
Error: ENOENT: no such file or directory, open './/Users/mike/projects/tic-tac-toe-ai/apps/backend/drizzle/migrations/meta/0000_snapshot.json'
```

**Root Cause:**
- Drizzle Kit was looking for a snapshot file in an incorrect path (notice the double slash `//`)
- The snapshot file exists at the correct location: `/Users/mike/projects/tic-tac-toe-ai/apps/backend/drizzle/migrations/meta/0000_snapshot.json`
- Path resolution issues in the migration folder preparation logic

**Environment Context:**
- Using Drizzle ORM `0.44.7`
- Drizzle Kit `0.31.6`
- PostgreSQL database with existing migrations
- Workspace monorepo structure with pnpm

### 2. Migration Execution Failure

**Command:**
```bash
pnpm --filter backend db:migrate
```

**Error:**
```
DrizzleQueryError: Failed query: CREATE TABLE "matches" (...)
relation "matches" already exists
```

**Root Cause:**
- Drizzle trying to recreate the entire schema from migration files
- Existing tables in database conflict with migration recreation
- Migration state management appears to be corrupted or out of sync

**Symptoms:**
- Drizzle notices schema exists but tries to recreate tables anyway
- Ignores existing tables and attempts full schema recreation
- Succeeds on creating schema and migrations table but fails on actual data tables

## Directory Structure

```
apps/backend/drizzle/
├── migrations/
│   ├── meta/
│   │   ├── _journal.json
│   │   └── 0000_snapshot.json  ✅ Exists
│   ├── 0000_initial.sql
│   ├── 0001_add_match_difficulty.sql
│   ├── 0002_add_game_board_state.sql
│   ├── leaderboard_tables.sql
│   └── 0003_remove_model_version.sql  ⚠️ Manual migration
├── schema.ts
└── backfill-leaderboard.sql
```

## Drizzle Configuration

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: resolve(baseDir, './apps/backend/drizzle/schema.ts'),
  out: resolve(baseDir, './apps/backend/drizzle/migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  strict: true,
})
```

## Workaround Applied

### Safe Alternative Approach

Instead of fixing the Drizzle issues immediately, we implemented a workaround:

1. **Kept Database Schema Intact**: Left `model_version` columns in database
2. **Updated Backend Logic**: Modified services to aggregate by `model_id` only
3. **Ignored Model Version**: Treated `model_version` as irrelevant in queries
4. **Used Canonical Names**: Updated match ingestion to use consistent model names

**Code Changes:**
```typescript
// leaderboard.ts - Aggregate by model_id only
const aggregatedStats = await db.execute(sql`
  SELECT
    model_id,
    SUM(total_matches) as total_matches,
    SUM(wins) as wins,
    SUM(losses) as losses,
    SUM(ties) as ties,
    ROUND(AVG(CAST(average_turns AS NUMERIC)), 2) as average_turns,
    MAX(last_updated_at) as last_updated_at
  FROM model_stats
  GROUP BY model_id
  ORDER BY MAX(last_updated_at) DESC
`)

// leaderboard-updater.ts - Use canonical model names
const player1Info = getModelInfo(player1ModelId)
const player1Version = player1Info?.name || match.aiModelVersion || match.playerOneModel
```

## Potential Solutions

### 1. Migration State Reset

Consider resetting migration state:
```bash
# Backup current data first
pg_dump $DATABASE_URL > backup.sql

# Remove migration metadata
rm -rf apps/backend/drizzle/migrations/meta/

# Regenerate from scratch (risky - may lose data)
pnpm --filter backend db:generate
```

### 2. Manual Migration Management

Continue using manual SQL migrations:
```sql
-- Created: 0003_remove_model_version.sql
-- Applied directly: psql "$DATABASE_URL" -f migration.sql
```

### 3. Alternative Migration Tools

Consider using alternative migration management:
- Direct PostgreSQL migrations
- Custom migration scripts
- Different ORM migration tools

## Investigation Notes

### File System Verification

All required files exist at correct locations:
- ✅ `0000_snapshot.json` present and readable
- ✅ Migration directory structure intact
- ✅ Schema file exists and is valid

### Database State Verification

Database schema matches expectations:
- ✅ All tables exist with correct columns
- ✅ Migration tracking table exists
- ✅ Current system works correctly

## Recommendations

### Short-term

1. **Continue with Workaround**: The current solution works perfectly and eliminates the duplicate entry problem
2. **Monitor for Issues**: Keep an eye on the current system stability
3. **Document for Team**: Share this workaround with other developers

### Medium-term

1. **Investigate Drizzle Version**: Test if upgrading Drizzle Kit resolves the issues
2. **Migration State Audit**: Clean up migration metadata if needed
3. **Test in Isolation**: Try reproducing the issue in a clean environment

### Long-term

1. **Migration Strategy**: Consider alternative migration management for complex schema changes
2. **Database Migration Policy**: Establish clear procedures for schema migrations
3. **CI/CD Integration**: Ensure migration processes work reliably in deployment pipelines

## Lessons Learned

1. **Complex Schema Changes**: Be cautious with removing columns that have unique constraints
2. **Migration State**: Drizzle's migration state can become corrupted and hard to debug
3. **Workaround Value**: Sometimes a code-level workaround is safer than fixing migration tools
4. **Incremental Approach**: Small, testable changes are better than complex migrations

## Future Migration Needs

### ⚠️ **Pending Database Cleanup Required**

**Current State**: Model version columns still exist in database but are ignored by backend logic

**Migration Needed**: Remove `model_version` columns from:
- `model_stats.model_version` (255 varchar, not null)
- `recent_matches.model_version` (255 varchar, not null)
- `recent_matches.opponent_model_version` (255 varchar, nullable)

**Migration File**: `0003_remove_model_version.sql` already created but not applied due to Drizzle issues

**When to Apply**:
- After Drizzle migration issues are resolved
- When confident in rollback procedures
- Preferably during maintenance window

### Migration Steps (When Ready):

1. **Backup Strategy**: Ensure comprehensive database backups
2. **Apply Manual Migration**: Use direct SQL or working Drizzle
3. **Test Thoroughly**: Verify all endpoints work correctly
4. **Update Schema Files**: Remove columns from Drizzle schema definitions
5. **Rollback Plan**: Have clear rollback procedures ready

### Impact Assessment:
- **Risk Level**: Medium (column removal)
- **System Impact**: Low (columns already ignored by code)
- **Rollback Complexity**: Low (columns can be re-added if needed)

---

*Last Updated: 2025-11-13*
*Status: Workaround Implemented - System Working Correctly*