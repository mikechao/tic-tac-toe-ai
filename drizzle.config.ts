import { defineConfig } from 'drizzle-kit'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const baseDir = dirname(fileURLToPath(import.meta.url))

// Pull in local defaults when running commands manually.
// CI/staging/production should provide DATABASE_URL (or *_STAGING / *_PRODUCTION)
// via the environment so this block is ignored there.
if (!process.env.DATABASE_URL) {
  loadEnv({ path: resolve(baseDir, './apps/backend/.dev.vars') })
}

function getDatabaseUrl(): string {
  const environment = process.env.ENVIRONMENT ?? 'development'

  if (environment === 'staging' && process.env.DATABASE_URL_STAGING) {
    return process.env.DATABASE_URL_STAGING
  }

  if (environment === 'production' && process.env.DATABASE_URL_PRODUCTION) {
    return process.env.DATABASE_URL_PRODUCTION
  }

  return process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/webmcp_dev'
}

export default defineConfig({
  schema: resolve(baseDir, './apps/backend/drizzle/schema.ts'),
  out: resolve(baseDir, './apps/backend/drizzle/migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  strict: true,
})