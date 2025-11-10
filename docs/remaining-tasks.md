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

### 6. Observability & resilience

- [ ] Enable Hyperdrive metrics + alerts (connectivity errors, cache hit rate)
- [ ] Use Xata webhooks or scheduled checks to detect schema drift between branches
- [ ] Extend `services/logger.ts` to tag log lines with `xata_branch` & `hyperdrive_region` for faster incident debugging

### 7. Developer experience

- [ ] Provide `make/xata.sh` (or pnpm script) to pull latest schema, open the web UI, and fetch sample data
- [ ] Update onboarding docs with steps to clone production branch into personal sandboxes
- [ ] Create Vitest fixtures that spin up Prisma/Xata in-memory mocks or record/replay HTTP fixtures for deterministic tests