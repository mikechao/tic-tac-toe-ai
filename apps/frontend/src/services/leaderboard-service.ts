import { apiClient } from '../lib/api-client'
import type { LeaderboardResponse } from '@arena/schema'

/**
 * Leaderboard data service
 * Provides real leaderboard data from the backend API
 */

export interface LeaderboardService {
  getLeaderboard(): Promise<LeaderboardResponse>
}

class HttpLeaderboardService implements LeaderboardService {
  async getLeaderboard(): Promise<LeaderboardResponse> {
    try {
      const response = await apiClient.get<LeaderboardResponse>('/api/leaderboard')
      return response
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error)
      throw error
    }
  }
}

// Create singleton instance
export const leaderboardService = new HttpLeaderboardService()

// Export type for dependency injection in tests
export type { LeaderboardService }