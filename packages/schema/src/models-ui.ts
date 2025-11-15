import type { LocalModelProvider } from './models'

type ProviderMeta = {
  label: string
  badgeClass: string
}

export const providerMetaMap: Record<LocalModelProvider, ProviderMeta> = {
  'chrome-builtin': {
    label: 'Chrome Built-In',
    badgeClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40',
  },
  'transformers-js': {
    label: 'Transformers.js (WebGPU)',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/40',
  },
}

export function getProviderMeta(provider: LocalModelProvider): ProviderMeta {
  return providerMetaMap[provider]
}

// Additional UI utilities can be added here as needed
export function getProviderIcon(provider: LocalModelProvider): string {
  switch (provider) {
    case 'chrome-builtin':
      return '🌐'
    case 'transformers-js':
      return '⚡'
    default:
      return '🤖'
  }
}

export function formatDownloadSize(sizeMB?: number): string {
  if (sizeMB === 0) return 'No download required'
  if (sizeMB && sizeMB > 0) {
    return `~${sizeMB}MB download`
  }
  return 'Size unknown'
}