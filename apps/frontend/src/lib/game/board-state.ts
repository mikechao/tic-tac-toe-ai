export type PlayerMark = 'X' | 'O'

export type CellValue = PlayerMark | null

export interface Move {
  row: number
  column: number
  index: number
}

const MIN_SIZE = 3
const MAX_SIZE = 5

export class BoardState {
  readonly size: number
  readonly winLength: number
  private cells: CellValue[]
  currentPlayer: PlayerMark
  moveCount: number

  constructor(size = MIN_SIZE, firstPlayer: PlayerMark = 'X') {
    if (!Number.isInteger(size)) {
      throw new Error(`Board size must be an integer, received ${size}`)
    }

    if (size < MIN_SIZE || size > MAX_SIZE) {
      throw new Error(
        `Board size must be between ${MIN_SIZE} and ${MAX_SIZE}, received ${size}`,
      )
    }

    this.size = size
    this.winLength = size
    this.cells = Array<CellValue>(this.size * this.size).fill(null)
    this.currentPlayer = firstPlayer
    this.moveCount = 0
  }

  getCells(): readonly CellValue[] {
    return this.cells
  }

  getCell(row: number, column: number): CellValue {
    return this.cells[this.toIndex(row, column)]
  }

  getValidMoves(): Move[] {
    const moves: Move[] = []
    for (let index = 0; index < this.cells.length; index += 1) {
      if (this.cells[index] === null) {
        moves.push(this.fromIndex(index))
      }
    }
    return moves
  }

  isValidMove(move: Move): boolean {
    if (!this.isInBounds(move.row, move.column)) {
      return false
    }
    return this.cells[move.index] === null
  }

  applyMove(move: Move, mark: PlayerMark): void {
    if (mark !== 'X' && mark !== 'O') {
      throw new Error(`Invalid player mark: ${mark}`)
    }

    if (!this.isInBounds(move.row, move.column)) {
      throw new Error(
        `Move out of bounds: (${move.row}, ${move.column}) on ${this.size}x${this.size} board`,
      )
    }

    if (this.cells[move.index] !== null) {
      throw new Error(`Cell ${move.index + 1} is already occupied`)
    }

    this.cells[move.index] = mark
    this.moveCount += 1
    this.currentPlayer = mark === 'X' ? 'O' : 'X'
  }

  reset(nextPlayer: PlayerMark = 'X'): void {
    this.cells.fill(null)
    this.moveCount = 0
    this.currentPlayer = nextPlayer
  }

  checkWinner(): PlayerMark | null {
    const lines: CellValue[][] = []

    for (let row = 0; row < this.size; row += 1) {
      const line: CellValue[] = []
      for (let column = 0; column < this.size; column += 1) {
        line.push(this.getCell(row, column))
      }
      lines.push(line)
    }

    for (let column = 0; column < this.size; column += 1) {
      const line: CellValue[] = []
      for (let row = 0; row < this.size; row += 1) {
        line.push(this.getCell(row, column))
      }
      lines.push(line)
    }

    const primaryDiagonal: CellValue[] = []
    const secondaryDiagonal: CellValue[] = []
    for (let index = 0; index < this.size; index += 1) {
      primaryDiagonal.push(this.getCell(index, index))
      secondaryDiagonal.push(this.getCell(index, this.size - 1 - index))
    }
    lines.push(primaryDiagonal, secondaryDiagonal)

    for (const line of lines) {
      const mark = this.evaluateLine(line)
      if (mark) {
        return mark
      }
    }

    return null
  }

  isDraw(): boolean {
    return this.moveCount === this.cells.length && this.checkWinner() === null
  }

  toAscii(includeMeta = true): string {
    const rows: string[] = []
    for (let row = 0; row < this.size; row += 1) {
      const renderedRow: string[] = []
      for (let column = 0; column < this.size; column += 1) {
        const index = this.toIndex(row, column)
        const value = this.cells[index]
        renderedRow.push(value ?? String(index + 1))
      }
      rows.push(renderedRow.join(' | '))
    }

    const separator = this.size > 1 ? `\n${this.buildSeparator()}\n` : '\n'
    const board = rows.join(separator)

    if (!includeMeta) {
      return board
    }

    return `${board}\nCurrent: ${this.currentPlayer} • Moves played: ${this.moveCount}`
  }

  private buildSeparator(): string {
    return Array(this.size).fill('---').join('-')
  }

  toIndex(row: number, column: number): number {
    if (!this.isInBounds(row, column)) {
      throw new Error(
        `Coordinates out of bounds: (${row}, ${column}) on ${this.size}x${this.size} board`,
      )
    }
    return row * this.size + column
  }

  fromIndex(index: number): Move {
    if (index < 0 || index >= this.cells.length) {
      throw new Error(
        `Index out of range: ${index} on ${this.size}x${this.size} board`,
      )
    }
    const row = Math.floor(index / this.size)
    const column = index % this.size
    return { row, column, index }
  }

  private isInBounds(row: number, column: number): boolean {
    const withinRow = row >= 0 && row < this.size
    const withinColumn = column >= 0 && column < this.size
    return withinRow && withinColumn
  }

  private evaluateLine(line: CellValue[]): PlayerMark | null {
    if (line.length !== this.winLength) {
      return null
    }

    const [first] = line
    if (first === null) {
      return null
    }

    for (let index = 1; index < line.length; index += 1) {
      if (line[index] !== first) {
        return null
      }
    }

    return first
  }
}
