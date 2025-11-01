import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import type { Env } from '../env'

export type Database = PostgresJsDatabase

export function createDb(env: Env): Database {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to create the database client')
  }

  const client = postgres(env.DATABASE_URL, {
    fetch: (input, init) => fetch(input, init),
    max: 1,
  })

  return drizzle(client)
}
