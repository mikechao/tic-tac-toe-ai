import { cn } from '@/lib/utils'

type StateVariant = 'empty' | 'error'

const variantStyles: Record<StateVariant, string> = {
  empty: 'border-white/15 bg-white/[0.04] text-white/70 [&>svg]:text-[#4ff2c2]',
  error:
    'border-[#f15bb5]/40 bg-[#f15bb5]/10 text-white [&>svg]:text-[#f15bb5]',
}

interface StateMessageProps {
  variant?: StateVariant
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function StateMessage({
  variant = 'empty',
  title,
  description,
  action,
  icon,
  className,
}: StateMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[1.5rem] border px-6 py-8 text-center',
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full border border-current/20 bg-current/5">
        {icon ?? (
          <span className="text-xl" aria-hidden="true">
            {variant === 'error' ? '!' : '✦'}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description ? (
          <p className="text-sm leading-relaxed text-white/70">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
