# Tech stack — tic-tac-toe-ai

A compact reference for the repository's technologies, conventions, and common dev commands.

## Overview
- Monorepo using pnpm workspaces and TurboRepo.
- Full TypeScript codebase (frontend, backend, shared packages).

## Languages
- TypeScript for all apps and packages
- TSX / React for frontend UI

## Monorepo & package management
- pnpm workspaces (`pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- TurboRepo orchestration (`turbo.json`)

## Frontend (apps/frontend)
- React + Vite (entry: `apps/frontend/src/main.tsx`)
- Routing: TanStack / generated route tree (`routeTree.gen.ts`)
- Data fetching: TanStack Query integration
- UI: Tailwind CSS + MagicUI / shadcn-style components (`src/components/ui/*`)
- Animations: `motion/react` (used by BlurFade)
- Gemini model integration lives under `src/integrations/gemini`
- Key files to inspect:
  - `apps/frontend/src/components/arena/MatchControls.tsx` (match UI)
  - `apps/frontend/src/main.tsx`
  - `apps/frontend/src/routes/`

## Backend (apps/backend)
- TypeScript server code (Cloudflare Workers style - `wrangler.toml` present)
- Drizzle ORM for database schema & migrations (`apps/backend/drizzle/`)
- Services and route handlers in `apps/backend/src/`
- DB migrations & seeds: `apps/backend/drizzle/migrations/`, `apps/backend/scripts/`

## Shared packages
- `packages/schema` contains shared types, DB schema and utilities consumed by both apps

## Dev tooling, linting & tests
- Biome for linting/formatting/checking (see `biome.json`) — `pnpm lint`, `pnpm format`, `pnpm check`
- Vitest for tests — `pnpm test`
- commitlint config (`commitlint.config.cjs`)
- MagicUI / shadcn CLI used for UI scaffolding (e.g. `pnpm dlx shadcn@latest add ...`)

## Most-used commands
Run these from the repo root (or see `apps/*/package.json`):

```bash
# Start frontend dev (Vite)
pnpm dev

# Build production bundles
pnpm build

# Preview production build
pnpm serve

# Run tests once
pnpm test

# Lint / format / check
pnpm lint
pnpm format
pnpm check
```

## Where to look (quick pointers)
- Frontend UI and MatchControls: `apps/frontend/src/components/arena/MatchControls.tsx`
- Frontend entry / routes: `apps/frontend/src/main.tsx`, `apps/frontend/src/routes/`
- Backend entry / services: `apps/backend/src/index.ts`, `apps/backend/src/services/`
- DB schema & migrations: `apps/backend/drizzle/`
- Shared types/schema: `packages/schema/src/index.ts`

## Notes & next steps (recommended)
- Add a short `README.md` at the repo root with the top commands for new contributors.
- Run `pnpm lint` and `pnpm test` locally to ensure everything is green after edits.
- Consider adding a `CONTRIBUTING.md` with the repo's component and merge guidelines.

---
Generated on: 2025-11-04
