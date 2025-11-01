export function nowUtc(): Date {
  return new Date()
}

export function toUnixSeconds(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000)
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000)
}
