import type { Env } from '../env'

export type Logger = {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export type LoggerVariables = {
  logger: Logger
}

let loggerInstance: Logger | undefined
let sentryInitialized = false
let sentryModule: typeof import('@sentry/cloudflare') | undefined

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

async function withSentry(env: Env) {
  if (!env.SENTRY_DSN) return undefined
  if (sentryModule) return sentryModule

  try {
    const mod = await import('@sentry/cloudflare')
    mod.init({
      dsn: env.SENTRY_DSN,
      environment: env.ENVIRONMENT ?? 'development',
      tracesSampleRate: 0,
    })
    sentryModule = mod
    sentryInitialized = true
    return mod
  } catch (error) {
    console.warn('Unable to initialize Sentry; continuing with console logging only.', error)
  }
  return undefined
}

function sendToSentry(level: 'warning' | 'error', message: string) {
  if (!sentryModule) return
  if (level === 'error') {
    sentryModule.captureMessage(message, 'error')
  } else {
    sentryModule.captureMessage(message, 'warning')
  }
}

function createLogger(env: Env): Logger {
  const dispatch = (level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]) => {
    ;(console[level] as (...input: unknown[]) => void)(...args)

    if (sentryInitialized && level !== 'debug' && sentryModule) {
      const message = formatArgs(args)
      if (level === 'warn') sendToSentry('warning', message)
      if (level === 'error') sendToSentry('error', message)
    }
  }

  return {
    debug: (...args) => dispatch('debug', ...args),
    info: (...args) => dispatch('info', ...args),
    warn: (...args) => dispatch('warn', ...args),
    error: (...args) => dispatch('error', ...args),
  }
}

export function initLogger(env: Env): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger(env)
  }

  if (env.SENTRY_DSN && !sentryInitialized) {
    void withSentry(env)
  }

  return loggerInstance
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = {
      debug: (...args) => console.debug(...args),
      info: (...args) => console.info(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
    }
  }
  return loggerInstance
}
