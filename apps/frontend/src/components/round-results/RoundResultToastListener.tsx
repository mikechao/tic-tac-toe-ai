import { useEffect } from 'react'

import { useToast } from '@/components/ui'
import {
  MATCH_NOT_FOUND_EVENT,
  ROUND_CONFLICT_EVENT,
  ROUND_RESULT_ERROR_EVENT,
  ROUND_RESULT_RETRY_REQUEST_EVENT,
  type MatchNotFoundEventDetail,
  type RoundConflictEventDetail,
  type RoundResultErrorEventDetail,
} from '@/lib/round-results'

export function RoundResultToastListener() {
  const { showToast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleConflict = (event: Event) => {
      const customEvent = event as CustomEvent<RoundConflictEventDetail>
      const matchIdSuffix = customEvent.detail?.matchId
        ? ` (match ${customEvent.detail.matchId.slice(0, 8)})`
        : ''
      showToast({
        title: 'Round already recorded',
        description: `This round was already recorded${matchIdSuffix}.`,
        variant: 'warning',
      })
    }

    const handleMatchMissing = (event: Event) => {
      const customEvent = event as CustomEvent<MatchNotFoundEventDetail>
      const matchIdSuffix = customEvent.detail?.matchId
        ? ` (match ${customEvent.detail.matchId.slice(0, 8)})`
        : ''
      showToast({
        title: 'Match not found',
        description: `We couldn’t find that match${matchIdSuffix}. Please restart the showdown.`,
        variant: 'warning',
      })
    }

    const handleGeneralError = (event: Event) => {
      const customEvent = event as CustomEvent<RoundResultErrorEventDetail>
      const { retryable, message } = customEvent.detail ?? {}
      const fallbackDescription =
        message ?? 'We ran into an issue while saving your round. Please try again.'
      showToast({
        title: 'Round save failed',
        description: fallbackDescription,
        variant: 'warning',
        actionLabel: retryable ? 'Retry submission' : undefined,
        onAction: retryable
          ? () => {
              dispatchRetryRequest(customEvent.detail)
            }
          : undefined,
      })
    }

    window.addEventListener(ROUND_CONFLICT_EVENT, handleConflict)
    window.addEventListener(MATCH_NOT_FOUND_EVENT, handleMatchMissing)
    window.addEventListener(ROUND_RESULT_ERROR_EVENT, handleGeneralError)
    return () => {
      window.removeEventListener(ROUND_CONFLICT_EVENT, handleConflict)
      window.removeEventListener(MATCH_NOT_FOUND_EVENT, handleMatchMissing)
      window.removeEventListener(ROUND_RESULT_ERROR_EVENT, handleGeneralError)
    }
  }, [showToast])

  return null
}

function dispatchRetryRequest(detail?: RoundResultErrorEventDetail) {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent(ROUND_RESULT_RETRY_REQUEST_EVENT, {
      detail,
    }),
  )
}
