import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

import { toast as sonnerToast } from 'sonner'

import { cn } from '@/lib/utils'
import { Toaster } from './sonner'

type ToastVariant = 'default' | 'success' | 'warning'

type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  showToast: (toast: ToastOptions) => string | number
  dismissToast: (id?: string | number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const toastVariantStyles: Record<ToastVariant, string> = {
  default: 'border-white/15 bg-[#0b1026]/90 text-white',
  success: 'border-[#4ff2c2]/50 bg-[#0b1026]/90 text-white',
  warning: 'border-[#ffb547]/50 bg-[#0b1026]/90 text-white',
}

function ArenaToastCard({
  title,
  description,
  variant = 'default',
  actionLabel,
  onAction,
  dismiss,
}: ToastOptions & { dismiss: () => void }) {
  return (
    <div
      className={cn(
        'rounded-[1.25rem] border px-5 py-4 shadow-[0_12px_32px_rgba(11,16,38,0.45)] backdrop-blur',
        toastVariantStyles[variant],
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            {title}
          </p>
          {description ? (
            <p className="text-sm text-white/70">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-white/60 transition hover:text-white"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={() => {
            dismiss()
            onAction?.()
          }}
          className="mt-3 inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((toast: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <ArenaToastCard
          {...toast}
          dismiss={() => {
            sonnerToast.dismiss(id)
          }}
        />
      ),
      {
        duration: 6000,
        className: 'border-none bg-transparent p-0 shadow-none',
        position: 'bottom-right',
      },
    )
  }, [])

  const dismissToast = useCallback((id?: string | number) => {
    sonnerToast.dismiss(id)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="bottom-right" closeButton={false} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
