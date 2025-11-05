import { useId } from 'react'

import { cn } from '@/lib/utils'
import { MagicCard } from '@/components/ui'

const timeRanges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
] as const

const modelFamilies = [
  { value: 'all', label: 'All models' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'gpt', label: 'GPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'mistral', label: 'Mistral' },
] as const

interface LeaderboardFiltersProps {
  selectedRange: typeof timeRanges[number]['value']
  onSelectRange: (value: typeof timeRanges[number]['value']) => void
  selectedFamily: typeof modelFamilies[number]['value']
  onSelectFamily: (value: typeof modelFamilies[number]['value']) => void
}

export function LeaderboardFilters({
  selectedRange,
  onSelectRange,
  selectedFamily,
  onSelectFamily,
}: LeaderboardFiltersProps) {
  const rangeGroupId = useId()
  const familyGroupId = useId()

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <MagicCard className="h-full border-white/15 bg-white/[0.04]" spotlight={false}>
        <fieldset className="space-y-4">
          <legend className="text-xs uppercase tracking-[0.3em] text-white/60">
            Time range
          </legend>
          <div className="flex flex-wrap gap-2">
            {timeRanges.map((range) => (
              <FilterButton
                key={range.value}
                groupId={rangeGroupId}
                label={range.label}
                value={range.value}
                isActive={selectedRange === range.value}
                onSelect={onSelectRange}
              />
            ))}
          </div>
        </fieldset>
      </MagicCard>
      <MagicCard className="h-full border-white/15 bg-white/[0.04]" spotlight={false}>
        <fieldset className="space-y-4">
          <legend className="text-xs uppercase tracking-[0.3em] text-white/60">
            Model family
          </legend>
          <div className="flex flex-wrap gap-2">
            {modelFamilies.map((family) => (
              <FilterButton
                key={family.value}
                groupId={familyGroupId}
                label={family.label}
                value={family.value}
                isActive={selectedFamily === family.value}
                onSelect={onSelectFamily}
              />
            ))}
          </div>
        </fieldset>
      </MagicCard>
    </div>
  )
}

function FilterButton({
  groupId,
  label,
  value,
  isActive,
  onSelect,
}: {
  groupId: string
  label: string
  value: string
  isActive: boolean
  onSelect: (value: any) => void
}) {
  const id = `${groupId}-${value}`
  return (
    <button
      id={id}
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
        isActive
          ? 'border-[#4ff2c2]/60 bg-[#4ff2c2]/20 text-white shadow-[0_0_24px_rgba(79,242,194,0.25)]'
          : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white',
      )}
      aria-pressed={isActive}
    >
      {label}
    </button>
  )
}
