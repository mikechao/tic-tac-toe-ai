import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  SENTRY_DSN: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().url().optional(),
  CF_VERSION_METADATA: z.string().optional()
})

export type Env = z.infer<typeof envSchema>
export type WorkerEnv = Env & { CF_VERSION_METADATA?: string }

export function validateEnv(bindings: unknown): Env {
  return envSchema.parse(bindings)
}
