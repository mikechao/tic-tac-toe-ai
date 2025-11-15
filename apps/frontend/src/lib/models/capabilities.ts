import type { LocalModelProvider } from '@arena/schema/models'

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

const transformersCapabilities: ProviderCapabilities = {
  supportsDownloadMonitor: true,
  requiresUserGesture: true,
  supportsBackgroundInstall: false,
  hasOnDeviceFallback: false,
}

const defaults: ProviderCapabilities = {
  supportsDownloadMonitor: false,
  requiresUserGesture: false,
  supportsBackgroundInstall: false,
  hasOnDeviceFallback: false,
}

export function getProviderCapabilities(
  provider: LocalModelProvider,
): ProviderCapabilities {
  if (provider === 'chrome-builtin') {
    return chromeCapabilities
  }
  if (provider === 'transformers-js') {
    return transformersCapabilities
  }
  return defaults
}
