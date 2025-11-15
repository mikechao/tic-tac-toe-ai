import { localAIModels } from '@arena/schema/models'
import type { ModelId } from '@arena/schema'

import type { ModelProvider } from './types'

type ProviderRegistry = Record<string, ModelProvider>

const registry: ProviderRegistry = {}

export function registerModelProvider(provider: ModelProvider): void {
  registry[provider.id] = provider
}

export function getModelProvider(providerId: string): ModelProvider | undefined {
  return registry[providerId]
}

export function getProviderForModel(modelId: ModelId): ModelProvider | undefined {
  const model = localAIModels.find((entry) => entry.id === modelId)
  if (!model) {
    return undefined
  }
  return getModelProvider(model.provider)
}
