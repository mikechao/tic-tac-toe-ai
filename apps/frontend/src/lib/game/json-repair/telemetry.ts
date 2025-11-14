import * as Sentry from '@sentry/react'
import type { JsonRepairTelemetry } from './types'

export function trackRepairTelemetry(telemetry: JsonRepairTelemetry): void {
  // Console logging for development
  console.debug('[JSONRepair] Telemetry:', {
    provider: telemetry.provider,
    success: telemetry.success,
    steps: telemetry.repairSteps,
    time: `${telemetry.processingTimeMs.toFixed(2)}ms`,
    round: telemetry.roundNumber
  })

  // Sentry integration for production monitoring
  Sentry.addBreadcrumb({
    category: 'json-repair',
    message: `JSON repair ${telemetry.success ? 'success' : 'failure'}`,
    level: telemetry.success ? 'info' : 'warning',
    data: {
      provider: telemetry.provider,
      repairSteps: telemetry.repairSteps,
      processingTimeMs: telemetry.processingTimeMs,
      roundNumber: telemetry.roundNumber,
      modelLabel: telemetry.modelLabel
    }
  })

  // Track repair failures as issues
  if (!telemetry.success) {
    Sentry.captureMessage('JSON repair failed', {
      level: 'warning',
      extra: telemetry
    } as any)
  }

  // Simple performance tracking via tags and breadcrumbs
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `JSON repair duration: ${telemetry.processingTimeMs.toFixed(2)}ms`,
    level: telemetry.processingTimeMs > 100 ? 'warning' : 'info',
    data: {
      provider: telemetry.provider,
      processingTimeMs: telemetry.processingTimeMs,
      modelLabel: telemetry.modelLabel,
      repairSteps: telemetry.repairSteps.length
    }
  })

  // Leaderboard stats tracking
  trackLeaderboardStats(telemetry)
}

// Leaderboard tracking for JSON reliability
function trackLeaderboardStats(telemetry: JsonRepairTelemetry): void {
  // Track reliability via custom events
  Sentry.addBreadcrumb({
    category: 'model-performance',
    message: `Model ${telemetry.modelLabel} JSON ${telemetry.success ? 'reliable' : 'unreliable'}`,
    level: telemetry.success ? 'info' : 'warning',
    data: {
      modelLabel: telemetry.modelLabel,
      provider: telemetry.provider,
      success: telemetry.success,
      repairSteps: telemetry.repairSteps,
      roundNumber: telemetry.roundNumber
    }
  })

  // Track repair attempts as separate breadcrumbs
  if (telemetry.repairSteps.length > 1) {
    Sentry.addBreadcrumb({
      category: 'model-performance',
      message: `Model ${telemetry.modelLabel} required JSON repair`,
      level: 'info',
      data: {
        modelLabel: telemetry.modelLabel,
        provider: telemetry.provider,
        repairSteps: telemetry.repairSteps.join(','),
        roundNumber: telemetry.roundNumber
      }
    })
  }

  // Track successful repairs
  if (telemetry.repairSteps.includes('jsonrepair-success')) {
    Sentry.addBreadcrumb({
      category: 'model-performance',
      message: `Model ${telemetry.modelLabel} JSON repair successful`,
      level: 'info',
      data: {
        modelLabel: telemetry.modelLabel,
        provider: telemetry.provider,
        roundNumber: telemetry.roundNumber
      }
    })
  }
}