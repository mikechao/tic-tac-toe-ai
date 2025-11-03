import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type PreferencesContextValue = {
  reducedMotion: boolean
  toggleReducedMotion: () => void
  setReducedMotion: (value: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
)

const STORAGE_KEY = 'ai-arena:reduced-motion'

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'true' || stored === 'false') {
    return stored === 'true'
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotionState] = useState<boolean>(() =>
    getInitialReducedMotion()
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, String(reducedMotion))
    document.documentElement.classList.toggle('reduce-motion', reducedMotion)
  }, [reducedMotion])

  const setReducedMotion = useCallback((value: boolean) => {
    setReducedMotionState(value)
  }, [])

  const toggleReducedMotion = useCallback(() => {
    setReducedMotionState((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({ reducedMotion, setReducedMotion, toggleReducedMotion }),
    [reducedMotion, setReducedMotion, toggleReducedMotion]
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider')
  }
  return context
}
