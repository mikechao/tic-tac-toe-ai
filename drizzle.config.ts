import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  'postgres://username:password@localhost:5432/tic_tac_toe_ai'

export default defineConfig({
  schema: './apps/backend/drizzle/schema.ts',
  out: './apps/backend/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
})
