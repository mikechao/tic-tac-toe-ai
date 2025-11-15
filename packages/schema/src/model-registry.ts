import type { ModelId } from './index'
import { localAIModels } from './models'

/**
 * Model Registry - Central place for model identification and metadata
 *
 * This registry maps current model names to ModelId numbers and provides
 * functions for both frontend and backend use.
 */

export interface ModelInfo {
  id: ModelId
  name: string
  provider: string
  vendor: string
}

// Current models mapped to their IDs
// Note: Names must match exactly what's stored in the database
export const MODEL_REGISTRY: Record<ModelId, ModelInfo> = localAIModels.reduce((acc, model) => {
  acc[model.id] = {
    id: model.id,
    name: model.name,
    provider: model.provider,
    vendor: model.vendor,
  }
  return acc
}, {} as Record<ModelId, ModelInfo>)

// Reverse lookup map: model name to ModelId
const MODEL_NAME_TO_ID: Record<string, ModelId> = Object.fromEntries(
  Object.values(MODEL_REGISTRY).map(model => [model.name, model.id])
)

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: ModelId): ModelInfo | null {
  return MODEL_REGISTRY[modelId] || null
}

/**
 * Get model ID by name
 */
export function getModelIdByName(name: string): ModelId | null {
  return MODEL_NAME_TO_ID[name] || null
}

/**
 * Get all registered models
 */
export function getAllModels(): ModelInfo[] {
  return Object.values(MODEL_REGISTRY)
}

/**
 * Get all model IDs
 */
export function getAllModelIds(): ModelId[] {
  return Object.keys(MODEL_REGISTRY).map(id => parseInt(id, 10) as ModelId)
}

/**
 * Check if a model ID is registered
 */
export function isRegisteredModelId(modelId: number): modelId is ModelId {
  return modelId in MODEL_REGISTRY
}

/**
 * Check if a model name is registered
 */
export function isRegisteredModelName(name: string): boolean {
  return name in MODEL_NAME_TO_ID
}

/**
 * Add a new model to the registry (for future extensibility)
 */
export function addModel(model: ModelInfo): void {
  MODEL_REGISTRY[model.id] = model
  MODEL_NAME_TO_ID[model.name] = model.id
}

/**
 * Get a human-readable display name for a model
 */
export function getModelDisplayName(modelId: ModelId): string {
  const model = getModelInfo(modelId)
  return model ? model.name : `Unknown Model (${modelId})`
}