export {
  roundResultSchema,
  roundResultResponseSchema,
  type RoundResult,
  type RoundResultResponse,
} from '@arena/schema'

import type { RoundResult } from '@arena/schema'

// Re-export RoundResult as RoundResultPayload for backward compatibility
export type RoundResultPayload = RoundResult
