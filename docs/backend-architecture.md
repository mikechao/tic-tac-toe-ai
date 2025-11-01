# Backend Architecture Overview

This document captures the current Cloudflare Worker backend layout, secrets, and
deployment workflow as of November 1, 2025. It will evolve as the service gains
real endpoints, data access, and observability.

## Runtime & Entry Point

- Runtime: Cloudflare Workers (module syntax, `nodejs_compat` enabled)
- Entry file: `apps/backend/src/index.ts`
  - Creates a `Hono` instance with bindings typed via `Env`
  - Validates environment bindings on every request (`validateEnv`)
  - Registers routes from `src/routes`
- Router organization:
  - `src/routes/index.ts` wires health checks and mounts `/api` namespace
  - `src/routes/api/router.ts` is the aggregation point for API sub-routes
  - Future feature routes live under `src/routes/api/*`

## Directory Structure (apps/backend)

```
src/
  env.ts          // Zod-based environment schema & validator
  index.ts        // Worker entry, mounts Hono app
  routes/
    index.ts      // Root router registration & health check
    api/
      router.ts   // Base API router placeholder (e.g., /api/version)
  lib/            // Shared helpers (placeholder)
  services/       // External integrations (placeholder)
drizzle/          // Future migrations + schema
.dev.vars         // Local Wrangler bindings (gitignored)
.env.example      // Production/staging env template (committed)
wrangler.toml     // Wrangler configuration (environments below)
```

## Environment Variables & Secrets

Bindings are validated with `validateEnv` in `src/env.ts`. Current schema:

| Variable       | Scope                | Description                                  |
| -------------- | -------------------- | -------------------------------------------- |
| `DATABASE_URL` | Optional in dev, req in deploy | Drizzle connection string via Hyperdrive |
| `ENVIRONMENT`  | dev/staging/production | Used for logging & feature flags            |

### Local Development

- `apps/backend/.dev.vars` is read by `wrangler dev --local`. It contains mock values:

```ini
DATABASE_URL="postgres://local:local@localhost:5432/tic_tac_toe_ai"
ENVIRONMENT="development"
```

> ⚠️ This file is gitignored. Update it with safe development credentials only.

### Staging & Production

- `wrangler.toml` declares per-environment vars:

```toml
[vars]
ENVIRONMENT = "development"

[env.staging]
vars = { ENVIRONMENT = "staging" }

[env.production]
vars = { ENVIRONMENT = "production" }
```

- Set secrets/bindings with Wrangler CLI:

```bash
pnpm --filter backend wrangler secret put DATABASE_URL --env staging
pnpm --filter backend wrangler secret put DATABASE_URL --env production
```

### Cloudflare Hyperdrive

- Backend leverages a Cloudflare Hyperdrive binding (declared as `DATABASE` in
  `wrangler.toml`). Provision Hyperdrive pointing at the upstream Postgres
  provider (PlanetScale as chosen in the project plan).
- Record the Hyperdrive connection string (HTTP endpoint) in the respective
  `DATABASE_URL` secret for each environment.
- Choose the region closest to primary users (e.g., `WAS`/`IAD` on PlanetScale)
  to minimize latency between Workers and Hyperdrive.

## Development Workflow

```bash
pnpm --filter backend dev        # Runs wrangler dev --local
curl http://127.0.0.1:8787/health
```

- Frontend targets the Worker via `VITE_BACKEND_URL` (see
  `apps/frontend/.env.example`). Update this value to match your local or
  deployed Worker URL.
- For new endpoints, add Hono routes under `src/routes/api/` and register them
  in `src/routes/api/router.ts`.

## Production Deployment

- Ensure `wrangler.toml` has bindings for `DATABASE` (Hyperdrive) and `vars`
  for environment names.
- Before deploying, run:

```bash
pnpm --filter backend build         # dry run deploy, validates Worker bundle
pnpm --filter backend wrangler publish --env production
```

> During publish, Wrangler reads secrets/bindings previously stored via
> `wrangler secret put` and `wrangler d1 binding` commands.

## Future Steps

- Add Drizzle configuration (`drizzle.config.ts`) and migrations under `drizzle/`
- Introduce services (e.g., telemetry, AI opponent proxies) in `src/services`
- Expand API routers with session/match endpoints described in `docs/plan.md`
- Integrate Sentry for observability once backend flows are implemented

