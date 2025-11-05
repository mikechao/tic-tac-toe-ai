import { createContext, useContext, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'warning'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const toastVariantStyles: Record<ToastVariant, string> = {
  default: 'border-white/15 bg-[#0b1026]/90 text-white',
  success: 'border-[#4ff2c2]/50 bg-[#0b1026]/90 text-white',
  warning: 'border-[#ffb547]/50 bg-[#0b1026]/90 text-white',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast: (toast) => {
        setToasts((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            variant: 'default',
            ...toast,
          },
        ])
      },
      dismissToast: (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      },
    }),
    [toasts],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={value.dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'rounded-[1.25rem] border px-5 py-4 shadow-[0_12px_32px_rgba(11,16,38,0.45)] backdrop-blur',
            toastVariantStyles[toast.variant ?? 'default'],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="text-sm text-white/70">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-sm text-white/60 transition hover:text-white"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
          {toast.actionLabel ? (
            <button
              type="button"
              onClick={() => {
                onDismiss(toast.id)
                toast.onAction?.()
              }}
              className="mt-3 inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:text-white"
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
