import type { Hono } from 'hono'

import type { Env, WorkerEnv } from '../../env'
import type { AuthVariables } from '../../services/auth'
import type { LoggerVariables } from '../../services/logger'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

export function registerApiRoutes(app: Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>): void {
  app.get('/version', (c) => {
    c.var.logger.info('version endpoint invoked')
    return c.json({ version: 'v0' })
  })
}
