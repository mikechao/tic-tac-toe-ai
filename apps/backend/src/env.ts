import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(bindings: unknown): Env {
  return envSchema.parse(bindings)
}
