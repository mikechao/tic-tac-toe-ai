import { localAIModels } from '@arena/schema/models'

export function getModelIdFromLabel(modelLabel: string): number {
  const model = localAIModels.find(m => m.name === modelLabel)
  if (!model) {
    throw new Error(`Unknown model label: ${modelLabel}`)
  }
  return model.id
}

export function getModelLabelFromId(modelId: number): string {
  const model = localAIModels.find(m => m.id === modelId)
  if (!model) {
    throw new Error(`Unknown model ID: ${modelId}`)
  }
  return model.name
}