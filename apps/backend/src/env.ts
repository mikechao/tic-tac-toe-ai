import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  SENTRY_DSN: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().url().optional(),
  CF_VERSION_METADATA: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

// WorkerEnv includes all bindings that Cloudflare Workers provides
export type WorkerEnv = {
  DATABASE?: D1Database  // D1 database binding from wrangler.toml
  DATABASE_URL?: string
  ENVIRONMENT?: 'development' | 'staging' | 'production'
  SENTRY_DSN?: string
  FRONTEND_ORIGIN?: string
  CF_VERSION_METADATA?: { id: string; tag?: string; timestamp?: string }
}

// D1Database type
interface D1Database {
  prepare(query: string): D1PreparedStatement
  dump(): Promise<ArrayBuffer>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1ExecResult>
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run<T = unknown>(): Promise<D1Result<T>>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  meta?: Record<string, unknown>
  error?: string
}

interface D1ExecResult {
  count: number
  duration: number
}

export function validateEnv(bindings: unknown): Env {
  return envSchema.parse(bindings)
}
