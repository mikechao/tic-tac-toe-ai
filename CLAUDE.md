# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Run from repository root:

```bash
# Development
pnpm dev                # Start both frontend (port 3000) and backend dev servers
pnpm --filter frontend dev  # Frontend only
pnpm --filter backend dev   # Backend only

# Build & Test
pnpm build             # Build all packages and apps
pnpm test              # Run tests across all packages
pnpm lint              # Lint with Biome
pnpm format            # Format code with Biome
pnpm check             # Run Biome check (lint + format)
pnpm typecheck         # Type check all TypeScript

# Database
pnpm db:migrate        # Run database migrations
pnpm --filter backend db:push  # Push schema changes to database
pnpm --filter backend db:studio # Open Drizzle Studio

# Docker
pnpm docker:up         # Start PostgreSQL container
pnpm docker:down       # Stop PostgreSQL container
```

## Architecture Overview

This is a **tic-tac-toe AI arena** built as a monorepo using pnpm workspaces and Turbo.

### Key Components

- **Frontend** (`apps/frontend/`): React + Vite + TanStack Router
- **Backend** (`apps/backend/`): Cloudflare Workers with Hono framework
- **Schema** (`packages/schema/`): Shared types and validation with Zod
- **Database**: PostgreSQL with Drizzle ORM

### AI Integration

The arena features **dual AI providers** for local tic-tac-toe gameplay:

1. **Gemini Nano** via Chrome's Prompt API (`@built-in-ai/core`)
2. **Transformers.js** running SmolLM2 locally (`@built-in-ai/transformers-js`)

Both providers are registered in a shared registry with unified status tracking.

### Frontend Architecture

- **Routing**: File-based routing with TanStack Router in `apps/frontend/src/routes/`
- **UI**: Tailwind CSS + MagicUI components (shadcn-style)
- **State Management**: TanStack Query + React Context for AI providers
- **Key Components**:
  - `MatchControls.tsx` - Game configuration and match start
  - `MatchBoard.tsx` - Interactive tic-tac-toe board
  - `MatchTelemetry.tsx` - Live game statistics and AI reasoning
  - `MatchMoveLog.tsx` - Animated move history

### Backend Architecture

- **Framework**: Hono on Cloudflare Workers
- **Database**: Drizzle ORM with PostgreSQL
- **Migrations**: Located in `apps/backend/drizzle/migrations/`
- **Services**: Game logic, player management, match orchestration

### Development Patterns

- **Monorepo**: Shared types in `packages/schema/` consumed by both apps
- **Code Quality**: Biome for linting/formatting, Vitest for testing
- **Type Safety**: Full TypeScript with strict mode
- **SSR**: TanStack Router supports multiple SSR strategies (see demo routes)

### Important Files

- `apps/frontend/src/components/arena/` - Core game UI components
- `apps/frontend/src/integrations/` - AI provider integrations
- `apps/backend/src/services/` - Backend business logic
- `drizzle.config.ts` - Database configuration
- `turbo.json` - Build orchestration

### Environment Setup

1. Install dependencies: `pnpm install`
2. Start database: `pnpm docker:up`
3. Run migrations: `pnpm db:migrate`
4. Start development: `pnpm dev`

The frontend will be available at http://localhost:3000, backend at http://localhost:8787 (Wrangler local).