/// <reference lib="webworker" />
import { TransformersJSWorkerHandler } from '@built-in-ai/transformers-js'

const handler = new TransformersJSWorkerHandler()

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event)
}
