import type { ConsolaInstance, LogObject } from 'consola'
import { createConsola } from 'consola'
import * as Sentry from '@sentry/cloudflare'

import type { Env } from '../env'

export type LoggerVariables = {
  logger: ConsolaInstance
}

let consolaInstance: ConsolaInstance | undefined
let sentryInitialized = false

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

function ensureSentry(env: Env) {
  if (!env.SENTRY_DSN || sentryInitialized) return
  try {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT ?? 'development',
      tracesSampleRate: 0,
    })
    sentryInitialized = true
  } catch (error) {
    console.warn('Unable to initialise Sentry; continuing with console logging only.', error)
  }
}

const reporter = {
  log(logObj: LogObject) {
    const method = logObj.type && methodExists(logObj.type) ? logObj.type : 'log'
    ;(console[method as keyof Console] as (...input: unknown[]) => void)(...logObj.args)

    if (!sentryInitialized) return

    const message = formatArgs(logObj.args)
    if (logObj.type === 'error' || logObj.type === 'fatal') {
      const [first] = logObj.args
      if (first instanceof Error) {
        Sentry.captureException(first)
        if (logObj.args.length > 1) {
          Sentry.captureMessage(formatArgs(logObj.args.slice(1)), 'error')
        }
        return
      }
      Sentry.captureMessage(message, 'error')
      return
    }

    if (logObj.type === 'warn') {
      Sentry.captureMessage(message, 'warning')
    }
  },
}

function methodExists(method: string): method is keyof Console {
  return method in console && typeof (console as Record<string, unknown>)[method] === 'function'
}

export function initLogger(env: Env): ConsolaInstance {
  if (!consolaInstance) {
    consolaInstance = createConsola({
      defaults: {
        tag: 'backend',
      },
      reporters: [reporter],
    })
    consolaInstance.wrapConsole()
  }

  ensureSentry(env)

  return consolaInstance
}

export function getLogger(): ConsolaInstance {
  if (!consolaInstance) {
    consolaInstance = createConsola()
  }
  return consolaInstance
}
