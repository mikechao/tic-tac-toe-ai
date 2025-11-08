import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

type MenuItem = {
  label: string
  to: string
}

interface MenuFluidProps {
  menuItems: MenuItem[]
  className?: string
  indicatorClassName?: string
  currentPath?: string
}

export const MenuFluid = ({
  menuItems,
  className,
  indicatorClassName,
  currentPath,
}: MenuFluidProps) => {
  const [hovered, setHovered] = useState<number | null>(null)
  const activeIndex = currentPath
    ? menuItems.findIndex((item) => item.to === currentPath)
    : -1
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 text-white/80 backdrop-blur',
        className
      )}
    >
      {menuItems.map((item, index) => (
        <Link
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
            index === activeIndex
              ? 'text-white'
              : 'text-white/40 hover:text-white/80',
          )}
          key={`${item.label}-${index}`}
          to={item.to}
          aria-current={index === activeIndex ? 'page' : undefined}
        >
          {(hovered === index || activeIndex === index) && (
            <motion.div
              layoutId="fluid"
              transition={{ duration: 0.2, ease: 'linear' }}
              className={cn(
                'absolute inset-0 rounded-full bg-[#4ff2c2]/20 shadow-[0_0_25px_rgba(79,242,194,0.35)]',
                indicatorClassName
              )}
            />
          )}
          <span className="font-semibold text-sm z-20 relative">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
