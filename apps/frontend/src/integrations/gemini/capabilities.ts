import { doesBrowserSupportBuiltInAI } from '@built-in-ai/core'

export function isBuiltInAISupported(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return doesBrowserSupportBuiltInAI()
  } catch {
    return false
  }
}
