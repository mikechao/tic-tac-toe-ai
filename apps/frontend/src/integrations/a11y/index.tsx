import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

// Live region --------------------------------------------------------------

type PolitenessSetting = 'polite' | 'assertive'

type LiveRegionContextValue = {
  announce: (message: string, politeness?: PolitenessSetting) => void
}

const LiveRegionContext = createContext<LiveRegionContextValue | undefined>(
  undefined
)

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<
    Array<{ id: number; text: string; politeness: PolitenessSetting }>
  >([])

  const announce = useCallback(
    (message: string, politeness: PolitenessSetting = 'polite') => {
      setMessages((prev) => [...prev, { id: Date.now(), text: message, politeness }])
    },
    []
  )

  useEffect(() => {
    if (messages.length > 3) {
      setMessages((prev) => prev.slice(prev.length - 3))
    }
  }, [messages])

  const value = useMemo(() => ({ announce }), [announce])

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {messages
          .filter((entry) => entry.politeness === 'polite')
          .map((entry) => (
            <p key={entry.id}>{entry.text}</p>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {messages
          .filter((entry) => entry.politeness === 'assertive')
          .map((entry) => (
            <p key={entry.id}>{entry.text}</p>
          ))}
      </div>
    </LiveRegionContext.Provider>
  )
}

export function useLiveRegion() {
  const context = useContext(LiveRegionContext)
  if (!context) {
    throw new Error('useLiveRegion must be used within LiveRegionProvider')
  }
  return context
}

// Focus utilities ----------------------------------------------------------

export function useFocusTrap<TElement extends HTMLElement>() {
  const containerRef = useRef<TElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const container = containerRef.current
    container?.addEventListener('keydown', handleKeyDown)

    return () => {
      container?.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [])

  return containerRef
}

export function useInitialFocus<TElement extends HTMLElement>() {
  const ref = useRef<TElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ref.current?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return ref
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  )
}
