import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(bindings: unknown): Env {
  return envSchema.parse(bindings)
}

