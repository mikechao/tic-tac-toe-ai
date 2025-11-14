import { useModelStats } from '@/hooks/useModelStats'

export function ModelReliabilityBadge({ modelLabel }: { modelLabel: string }) {
  const { stats, isLoading, error } = useModelStats(modelLabel)

  // Don't show anything during loading or if there's an error
  // This prevents breaking the UI when backend isn't available
  if (isLoading || error || !stats) {
    return null
  }

  const reliabilityColor = stats.jsonReliability > 0.95 ? 'text-green-400' :
                         stats.jsonReliability > 0.85 ? 'text-yellow-400' :
                         'text-red-400'

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-white/60">JSON Reliability:</span>
      <span className={`font-semibold ${reliabilityColor}`}>
        {(stats.jsonReliability * 100).toFixed(1)}%
      </span>
      {stats.repairAttempts > 0 && (
        <span className="text-white/40">
          ({stats.repairAttempts} repairs, {(stats.repairSuccessRate * 100).toFixed(0)}% success)
        </span>
      )}
    </div>
  )
}