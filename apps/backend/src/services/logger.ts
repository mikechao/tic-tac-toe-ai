import type { ConsolaInstance } from 'consola'
import { createConsola } from 'consola'
import * as Sentry from '@sentry/cloudflare'

export type LoggerVariables = {
  logger: ConsolaInstance
}

let consolaInstance: ConsolaInstance | undefined

export function initLogger(): ConsolaInstance {
  if (!consolaInstance) {
    consolaInstance = createConsola({
      defaults: {
        tag: 'backend',
      },
    })
    consolaInstance.wrapConsole()
  }
  const sentryReporter = Sentry.createConsolaReporter()
  consolaInstance.addReporter(sentryReporter)

  return consolaInstance
}

export function getLogger(): ConsolaInstance {
  if (!consolaInstance) {
    consolaInstance = createConsola()
  }
  return consolaInstance
}
