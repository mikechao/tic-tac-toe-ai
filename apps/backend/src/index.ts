import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import * as Sentry from '@sentry/cloudflare'

import { validateEnv, type Env, type WorkerEnv } from './env'
import { registerRoutes } from './routes'
import { createAuthMiddleware, type AuthVariables } from './services/auth'
import { initLogger, type LoggerVariables } from './services/logger'

type RuntimeVariables = { runtimeEnv: Env }
type AppVariables = AuthVariables & LoggerVariables & RuntimeVariables

const app = new Hono<{ Bindings: WorkerEnv; Variables: AppVariables }>()

app.use('*', (c, next) => {
  const corsHandler = cors({
    origin: c.env.FRONTEND_ORIGIN ?? '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  })

  return corsHandler(c, next)
})

app.use('*', async (c, next) => {
  const env = validateEnv(c.env)
  c.set('runtimeEnv', env)
  const logger = initLogger()
  c.set('logger', logger)
  return next()
})

const authMiddleware = createAuthMiddleware()
app.use('*', authMiddleware)

registerRoutes(app)

app.notFound((c) => {
  c.var.logger?.warn('Route not found', { path: c.req.path })
  return c.json({ message: 'Not Found' }, 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    c.var.logger?.warn('Handled HTTP exception', {
      status: err.status,
      message: err.message,
    })
    return err.getResponse()
  }
  c.var.logger?.error('Unhandled error', err)
  return c.json({ message: 'Internal Server Error' }, 500)
})

export default Sentry.withSentry((env: WorkerEnv) => {
  const cfVersionMetadata = env.CF_VERSION_METADATA
  const versionId =
    typeof cfVersionMetadata === 'string'
      ? cfVersionMetadata
      : cfVersionMetadata?.id
  return {
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT ?? 'development',
    release: versionId ? `backend@${versionId}` : undefined,
    tracesSampleRate: 1.0, // Set to 1.0 for development, adjust for production
    enableLogs: true,
    sendDefaultPii: true,
  }
}, app)
