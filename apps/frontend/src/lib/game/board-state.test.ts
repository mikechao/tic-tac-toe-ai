import { describe, expect, it } from 'vitest'

import { BoardState } from './board-state'

describe('BoardState', () => {
  it('enforces board size range between 3 and 5', () => {
    expect(() => new BoardState(2)).toThrowError()
    expect(() => new BoardState(6)).toThrowError()
    expect(() => new BoardState(3)).not.toThrowError()
    expect(() => new BoardState(5)).not.toThrowError()
  })

  it('applies a move and switches the current player', () => {
    const board = new BoardState()
    const move = board.fromIndex(0)
    board.applyMove(move, 'X')

    expect(board.getCell(move.row, move.column)).toEqual('X')
    expect(board.moveCount).toEqual(1)
    expect(board.currentPlayer).toEqual('O')
  })

  it('identifies a winning row', () => {
    const board = new BoardState()
    board.applyMove(board.fromIndex(0), 'X')
    board.applyMove(board.fromIndex(3), 'O')
    board.applyMove(board.fromIndex(1), 'X')
    board.applyMove(board.fromIndex(4), 'O')
    board.applyMove(board.fromIndex(2), 'X')

    expect(board.checkWinner()).toEqual('X')
    expect(board.isDraw()).toEqual(false)
  })

  it('supports diagonal wins on larger boards', () => {
    const board = new BoardState(4)

    board.applyMove(board.fromIndex(0), 'X')
    board.applyMove(board.fromIndex(1), 'O')
    board.applyMove(board.fromIndex(5), 'X')
    board.applyMove(board.fromIndex(2), 'O')
    board.applyMove(board.fromIndex(10), 'X')
    board.applyMove(board.fromIndex(3), 'O')
    board.applyMove(board.fromIndex(15), 'X')

    expect(board.checkWinner()).toEqual('X')
  })

  it('renders ascii with numbered empty cells and metadata', () => {
    const board = new BoardState()
    board.applyMove(board.fromIndex(0), 'X')
    board.applyMove(board.fromIndex(4), 'O')

    expect(board.toAscii()).toMatchInlineSnapshot(`
      "X | 2 | 3
      -----------
      4 | O | 6
      -----------
      7 | 8 | 9
      Current: X • Moves played: 2"
    `)
  })

  it('detects a draw when the board is full with no winner', () => {
    const board = new BoardState()
    const scriptedMoves: Array<[number, 'X' | 'O']> = [
      [0, 'X'],
      [1, 'O'],
      [2, 'X'],
      [4, 'O'],
      [3, 'X'],
      [5, 'O'],
      [7, 'X'],
      [6, 'O'],
      [8, 'X'],
    ]

    for (const [index, mark] of scriptedMoves) {
      board.applyMove(board.fromIndex(index), mark)
    }

    expect(board.checkWinner()).toBeNull()
    expect(board.isDraw()).toBe(true)
    expect(board.getValidMoves()).toHaveLength(0)
  })

  it('rejects invalid moves', () => {
    const board = new BoardState()
    const firstMove = board.fromIndex(0)
    board.applyMove(firstMove, 'X')

    expect(board.isValidMove(firstMove)).toBe(false)
    expect(() => board.applyMove(firstMove, 'O')).toThrowError(/already occupied/i)

    const outOfBoundsMove = { row: -1, column: 0, index: -1 }
    expect(board.isValidMove(outOfBoundsMove)).toBe(false)
    expect(() => board.applyMove(outOfBoundsMove, 'O')).toThrowError(/out of bounds/i)
  })
})
