import { z } from 'zod'

const cfVersionMetadataSchema = z
  .union([
    z.string(),
    z.object({
      id: z.string(),
      tag: z.string().optional(),
      timestamp: z.string().optional(),
    }),
  ])
  .optional()

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  SENTRY_DSN: z.string().url().optional(),
  FRONTEND_ORIGIN: z.string().url().optional(),
  CF_VERSION_METADATA: cfVersionMetadataSchema,
})

export type Env = z.infer<typeof envSchema>

// WorkerEnv includes all bindings that Cloudflare Workers provides
export type WorkerEnv = {
  DATABASE_URL?: string
  ENVIRONMENT?: 'development' | 'staging' | 'production'
  SENTRY_DSN?: string
  FRONTEND_ORIGIN?: string
  CF_VERSION_METADATA?:
    | { id: string; tag?: string; timestamp?: string }
    | string
}

export function validateEnv(bindings: unknown): Env {
  return envSchema.parse(bindings)
}
