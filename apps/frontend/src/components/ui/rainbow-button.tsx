import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const rainbowButtonVariants = cva(
  cn(
    'group relative inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:cursor-pointer',
    'rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-[0.25em]',
    'animate-rainbow transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:cursor-not-allowed disabled:opacity-60',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default: cn(
          'border border-white/10 text-[color:var(--background)] hover:cursor-pointer',
          'bg-[linear-gradient(120deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.82)_35%,rgba(255,255,255,0.75)_60%,rgba(255,255,255,0.8)_100%),linear-gradient(120deg,var(--primary)_0%,var(--secondary)_50%,var(--accent)_100%),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]',
          'bg-[length:200%_100%,200%_100%,200%_100%]',
          '[background-clip:padding-box,border-box,border-box] [background-origin:border-box]',
          'shadow-[0_14px_40px_rgba(79,242,194,0.25)] group-hover:[background-position:100%] group-hover:shadow-[0_18px_52px_rgba(241,91,181,0.35)]',
          "before:absolute before:inset-x-6 before:bottom-[-20%] before:top-auto before:-z-10 before:h-1/2 before:rounded-full before:opacity-70 before:blur-3xl before:transition-opacity before:duration-300 before:content-['']",
          'before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] group-hover:before:opacity-90',
        ),
        outline: cn(
          'border border-white/30 text-white/80',
          'bg-[length:220%] [background:linear-gradient(120deg,rgba(255,255,255,0.12),rgba(79,242,194,0.18),rgba(241,91,181,0.18))]',
        ),
      },
      size: {
        default: 'h-11',
        sm: 'h-10 px-5 text-xs',
        lg: 'h-12 px-9 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof rainbowButtonVariants> {
  asChild?: boolean
}

const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        data-slot="button"
        className={cn(rainbowButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)

RainbowButton.displayName = 'RainbowButton'

export { RainbowButton, rainbowButtonVariants, type RainbowButtonProps }
