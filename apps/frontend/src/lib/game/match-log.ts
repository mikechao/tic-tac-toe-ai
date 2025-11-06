export interface MoveLogEntry {
  round: number
  turn: number
  actor: 'modelA' | 'modelB'
  moveNumber: number
  rationale: string
  wasValid: boolean
  durationMs: number
  rawResponse?: unknown
  timestamp: number
  timeout?: boolean
}

export class MatchLog {
  private entries: MoveLogEntry[] = []

  append(entry: MoveLogEntry): void {
    this.entries = [...this.entries, { ...entry }]
  }

  getEntries(): MoveLogEntry[] {
    return this.entries.map((entry) => ({ ...entry }))
  }

  clear(): void {
    this.entries = []
  }

  size(): number {
    return this.entries.length
  }
}
