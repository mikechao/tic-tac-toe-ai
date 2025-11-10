const CACHE_NAMES = [
  '@huggingface/transformers',
  '@huggingface/transformers-cache',
  'transformers-js-cache',
]

const DB_NAMES = ['@huggingface/transformers']

async function clearCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return
  }
  try {
    const existing = await caches.keys()
    await Promise.all(
      existing
        .filter((name) => CACHE_NAMES.some((target) => name.includes(target)))
        .map((name) => caches.delete(name).catch(() => false)),
    )
  } catch (error) {
    console.warn('[TransformersStorage] cache clear failed', error)
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    let resolved = false
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => {
      resolved = true
      resolve()
    }
    request.onerror = () => {
      if (!resolved) {
        resolve()
      }
    }
    request.onblocked = () => {
      if (!resolved) {
        resolve()
      }
    }
  })
}

async function clearDatabases(): Promise<void> {
  await Promise.all(DB_NAMES.map((name) => deleteDatabase(name)))
}

export async function clearTransformersStorage(): Promise<void> {
  await Promise.all([clearCaches(), clearDatabases()])
}
