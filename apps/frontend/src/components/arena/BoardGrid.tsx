import { cn } from '@/lib/utils'
import type { BoardState } from '@/lib/game/board-state'

type BoardGridProps = {
  board: BoardState
  boardSize: number
  highlights?: Array<{ indices: number[]; className?: string }>
  className?: string
  ariaLabel?: string
}

function formatCellLabel(row: number, column: number, boardSize: number): string {
  const index = row * boardSize + column + 1
  return String(index)
}

export function BoardGrid({
  board,
  boardSize,
  highlights,
  className,
  ariaLabel = 'Tic tac toe match board',
}: BoardGridProps) {
  const boardCells = board.getCells()

  const rows = Array.from({ length: boardSize }, (_, rowIndex) =>
    Array.from({ length: boardSize }, (_, columnIndex) => {
      const index = rowIndex * boardSize + columnIndex
      return {
        id: `cell-${index}`,
        label: formatCellLabel(rowIndex, columnIndex, boardSize),
        mark: boardCells[index],
        index,
      }
    }),
  )

  return (
    <table
      aria-label={ariaLabel}
      className={cn(
        'w-full border-separate border-spacing-3 sm:border-spacing-4',
        className,
      )}
    >
      <tbody>
        {rows.map((row) => {
          const rowKey = row.length ? `row-${row[0].id}` : 'row-fallback'
          return (
            <tr key={rowKey} className="align-middle">
            {row.map((cell) => (
              <td
                key={cell.id}
                aria-label={`${cell.label} ${
                  cell.mark ? `contains ${cell.mark}` : 'is empty'
                }`}
                data-cell-index={cell.index}
                className={cn(
                  'relative h-24 min-w-[6rem] rounded-[1.25rem] border border-white/12 bg-white/5 text-center text-3xl font-semibold uppercase transition sm:h-28 sm:text-4xl lg:h-32',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ff2c2]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--muted-surface)]',
                  (() => {
                    if (!highlights?.length) {
                      return 'hover:border-white/25 hover:bg-white/10'
                    }
                    const matchingHighlights = highlights
                      .filter((highlight) =>
                        highlight.indices?.includes(cell.index),
                      )
                      .map((highlight) => highlight.className)
                      .filter(Boolean)
                    if (matchingHighlights.length === 0) {
                      return 'hover:border-white/25 hover:bg-white/10'
                    }
                    return matchingHighlights.join(' ')
                  })(),
                )}
              >
                <span className="absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  {cell.label}
                </span>
                <span
                  className={cn(
                    'text-4xl font-semibold transition-transform duration-300 sm:text-5xl',
                    cell.mark ? 'scale-100' : 'scale-90 text-white/30',
                    cell.mark === 'X' && 'text-[#4ff2c2]',
                    cell.mark === 'O' && 'text-[#f15bb5]',
                  )}
                >
                  {cell.mark ?? '·'}
                </span>
              </td>
            ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
