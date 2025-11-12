import type { LeaderboardEntry } from './index'

export interface RankingMetrics {
  winRate: number
  totalMatches: number
  averageTurns: number
}

export function calculateRank(
  metrics: RankingMetrics,
  minMatchesThreshold: number = 5
): number {
  // Primary: Win rate (weighted 70%)
  // Secondary: Total matches (weighted 20%) - rewards more games
  // Tertiary: Average turns (weighted 10%) - lower is better (efficiency)

  if (metrics.totalMatches < minMatchesThreshold) {
    return -1 // Not enough matches to rank
  }

  const winRateScore = metrics.winRate * 0.7
  const volumeScore = Math.min(metrics.totalMatches / 100, 1) * 0.2 // Cap at 100 matches
  const efficiencyScore = Math.max(0, (9 - metrics.averageTurns) / 9) * 0.1 // Lower turns better

  return winRateScore + volumeScore + efficiencyScore
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const MIN_MATCHES_THRESHOLD = 5

  // Separate ranked and unranked entries
  const rankedEntries = entries.filter(entry => entry.matches >= MIN_MATCHES_THRESHOLD)
  const unrankedEntries = entries.filter(entry => entry.matches < MIN_MATCHES_THRESHOLD)

  // Sort ranked entries
  const sortedRanked = rankedEntries
    .sort((a, b) => {
      const scoreA = calculateRank({ winRate: a.winRate, totalMatches: a.matches, averageTurns: a.averageTurns }, MIN_MATCHES_THRESHOLD)
      const scoreB = calculateRank({ winRate: b.winRate, totalMatches: b.matches, averageTurns: b.averageTurns }, MIN_MATCHES_THRESHOLD)

      if (scoreB !== scoreA) return scoreB - scoreA // Higher score wins

      // Tie-breaker 1: Higher win rate
      if (b.winRate !== a.winRate) return b.winRate - a.winRate

      // Tie-breaker 2: More matches
      if (b.matches !== a.matches) return b.matches - a.matches

      // Tie-breaker 3: Lower average turns (more efficient)
      return a.averageTurns - b.averageTurns
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  // Mark unranked entries with rank: null
  const markedUnranked = unrankedEntries.map(entry => ({ ...entry, rank: null }))

  // Combine: ranked entries first, then unranked entries
  return [...sortedRanked, ...markedUnranked]
}

// API Response: Returns all entries, ranked entries have rank numbers, unranked entries have rank: null
// Frontend: Display ranked entries in main leaderboard, optionally show unranked entries in separate section