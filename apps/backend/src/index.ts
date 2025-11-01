import { Hono } from 'hono'

import { validateEnv, type Env } from './env'
import { registerRoutes } from './routes'
import { createAuthMiddleware, type AuthVariables } from './services/auth'
import { initLogger, type LoggerVariables } from './services/logger'

type AppVariables = AuthVariables & LoggerVariables

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('*', async (c, next) => {
  const env = validateEnv(c.env)
  const logger = initLogger(env)
  c.set('logger', logger)
  return next()
})

const authMiddleware = createAuthMiddleware()
app.use('*', authMiddleware)

registerRoutes(app)

export default app
