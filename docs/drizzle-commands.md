# Drizzle Commands

This document contains the essential drizzle commands for database operations.

## Development Commands

### Generate New Migrations
```bash
pnpm --filter backend db:generate
```
Creates new migrations when schema changes are detected in `apps/backend/drizzle/schema.ts`.

### Apply Migrations
```bash
pnpm --filter backend db:migrate
```
Applies migrations safely in production. Tracks which migrations have been applied to prevent re-running them.

### Push Schema Changes (Development Only)
```bash
pnpm --filter backend db:push
```
Pushes schema changes directly to the database. Use only for development - not recommended for production.

### Open Drizzle Studio
```bash
pnpm --filter backend db:studio
```
Opens Drizzle Studio for visual database management and inspection.

## Production Workflow

1. Make schema changes in `apps/backend/drizzle/schema.ts`
2. Generate migration: `pnpm --filter backend db:generate`
3. Review generated migration in `apps/backend/drizzle/migrations/`
4. Apply in production: `pnpm --filter backend db:migrate`

## Configuration

The drizzle configuration is located at `apps/backend/drizzle.config.ts` with:
- Schema path: `./drizzle/schema.ts`
- Migrations output: `./drizzle/migrations`
- Database connection from `.dev.vars` (development) or environment variables (production)

## Create clean db
  Steps to recreate database with drizzle:

  1. Create the database:
  docker exec arena-postgres psql -U postgres -c "DROP DATABASE IF EXISTS arena;"
  docker exec arena-postgres psql -U postgres -c "CREATE DATABASE arena;"
  2. Apply drizzle migrations:
  pnpm --filter backend db:migrate