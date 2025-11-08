import type { BuiltInAIProvider } from '@/data/models'

export interface ProviderCapabilities {
  supportsDownloadMonitor: boolean
  requiresUserGesture: boolean
  supportsBackgroundInstall: boolean
  hasOnDeviceFallback: boolean
}

const chromeCapabilities: ProviderCapabilities = {
  supportsDownloadMonitor: true,
  requiresUserGesture: true,
  supportsBackgroundInstall: false,
  hasOnDeviceFallback: true,
}

const defaults: ProviderCapabilities = {
  supportsDownloadMonitor: false,
  requiresUserGesture: false,
  supportsBackgroundInstall: false,
  hasOnDeviceFallback: false,
}

export function getProviderCapabilities(
  provider: BuiltInAIProvider,
): ProviderCapabilities {
  if (provider === 'chrome-builtin') {
    return chromeCapabilities
  }
  return defaults
}
