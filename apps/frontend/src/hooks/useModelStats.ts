import { useEffect, useState, useCallback } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'

interface ModelReliabilityStats {
  modelLabel: string
  jsonReliability: number // 0-1 percentage
  repairAttempts: number
  repairSuccessRate: number
  totalMoves: number
}

export function useModelStats(modelLabel: string) {
  const [stats, setStats] = useState<ModelReliabilityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      const data = await apiClient.get<ModelReliabilityStats>(`/api/model-stats/${modelLabel}`)
      setStats(data)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message :
                          err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      // Don't log to console to reduce noise during development
      // console.error('Failed to fetch model stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [modelLabel])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}
