import { defineConfig } from 'drizzle-kit'
import { config as loadEnv } from 'dotenv'

// Pull in local defaults when running commands manually.
// CI/staging/production should provide DATABASE_URL (or *_STAGING / *_PRODUCTION)
// via the environment so this block is ignored there.
if (!process.env.DATABASE_URL) {
  loadEnv({ path: '.dev.vars' })
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
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  strict: true,
})