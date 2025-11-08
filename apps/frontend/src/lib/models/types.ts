export type BuiltInAIState =
  | 'not-supported'
  | 'checking'
  | 'downloadable'
  | 'downloading'
  | 'installing'
  | 'ready'
  | 'error'

export type DownloadPhase =
  | 'idle'
  | 'starting'
  | 'downloading'
  | 'finalizing'
  | 'completed'
  | 'failed'

export interface ModelDownloadProgress {
  phase: DownloadPhase
  percent: number
  receivedBytes: number | null
  totalBytes: number | null
  lastUpdatedAt: number
}
