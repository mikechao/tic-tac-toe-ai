import type { JsonRepairModule } from './types'

let jsonrepairCache: JsonRepairModule | null = null

export async function loadJsonRepair(): Promise<JsonRepairModule> {
  if (jsonrepairCache) return jsonrepairCache

  const module = await import('jsonrepair')
  jsonrepairCache = module
  return module
}

export async function repairJsonAsync(
  text: string,
  timeoutMs: number = 100
): Promise<string> {
  const { jsonrepair } = await loadJsonRepair()

  return Promise.race([
    Promise.resolve(jsonrepair(text)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Repair timeout')), timeoutMs)
    )
  ])
}