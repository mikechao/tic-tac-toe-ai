import { toast } from 'sonner'
import type { JsonRepairTelemetry } from './types'

export function handleRepairFailure(
  error: string,
  telemetry: JsonRepairTelemetry
): void {
  toast.error('AI Response Error', {
    description: `AI response parsing failed: ${error}. Match ended.`,
    duration: 5000,
    action: {
      label: 'Details',
      onClick: () => console.log('[JSONRepair] Failure details:', telemetry)
    }
  })
}