import { useQuery } from '@tanstack/react-query'

import { leaderboardService } from '@/services/leaderboard-service'
import { localAIModels } from '@/data/models'
import type { LeaderboardEntry } from '@arena/schema'

export interface LeaderboardViewEntry extends LeaderboardEntry {
  model: (typeof localAIModels)[number] | undefined
  opponent: (typeof localAIModels)[number] | undefined
}

/**
 * React hook for fetching leaderboard data with TanStack Query
 * Transforms API response to match the existing component interface
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardViewEntry[]> => {
      const response = await leaderboardService.getLeaderboard()

      // Transform API entries to view entries with model information
      return response.entries.map((entry): LeaderboardViewEntry => {
        const model = localAIModels.find((candidate) => candidate.id === entry.modelId)
        const opponentId = entry.lastMatchup?.opponentId
        const opponent = opponentId
          ? localAIModels.find((candidate) => candidate.id === opponentId)
          : undefined

        return {
          ...entry,
          model,
          opponent,
        }
      })
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  })
}
