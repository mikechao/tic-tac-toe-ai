import type { Context } from 'hono'

import type { Env, WorkerEnv } from '../../../env'
import type { AuthVariables } from '../../../services/auth'
import type { LoggerVariables } from '../../../services/logger'

type AppVariables = AuthVariables & LoggerVariables & { runtimeEnv: Env }

/**
 * Handler for POST /sentry
 *
 * This handler was extracted from `router.ts` to keep route definitions thin
 * and allow easier testing. It currently behaves as a lightweight receiver
 * and returns 204 No Content. Update with real behavior as needed.
 */
export async function postSentry(
  c: Context<{ Bindings: WorkerEnv; Variables: AppVariables }>,
) {
  const { logger } = c.var

  // Keep the handler minimal for now. If you want the endpoint to accept
  // a payload and do something (persist, forward, etc.) implement that here.
  logger?.info('Sentry endpoint invoked')

  // Return a plain Response with 204 No Content to avoid any typed helper
  // overload issues during typechecking.
  return new Response(null, { status: 204 })
}
