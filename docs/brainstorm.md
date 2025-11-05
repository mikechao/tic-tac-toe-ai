# Tic-Tac-Toe Board Brainstorm

## Goals
- Represent a single round of tic-tac-toe entirely on the frontend, independent of backend state.
- Support variable board dimensions (`rows`, `columns`) with sensible defaults of 3×3.
- Track move legality, current board state, and configurable win conditions.
- Emit a text/ASCII rendering suitable for shipping to local AI models or logging.

## Proposed Class Design
- File target: `src/lib/game/Board.ts` (colocated with other core logic when introduced).
- Name: `BoardState` (exported class) to keep separation from UI components.
- Constructor signature: `constructor(size = 3, winLength = size)`.
- Internally mirror `rows = size` and `columns = size` to enforce square boards.
- Guard `size` to stay within `[3, 5]`, throwing on invalid inputs to avoid malformed boards.
- Internal storage: flat `Array<PlayerMark | null>` sized `rows * columns` for quick cloning and serialization.
- Player marks: union type (`'X' | 'O'`) kept in shared constants to align with UI badge assets.
- Turns tracked via a simple `currentPlayer` field plus move counter for draw detection.

## Key Responsibilities
- `getValidMoves(): Move[]` returns coordinates or index positions where the cell is empty.
- `applyMove(move: Move, mark: PlayerMark): void` mutates the internal board; throws on out-of-bounds or occupied cells.
- `checkWinner(): PlayerMark | null` scans all rows, columns, and diagonals for `winLength` aligned marks.
- `isDraw(): boolean` true when no valid moves remain and no winner exists.
- `toAscii(includeMeta = true): string` renders the board plus optional metadata line, e.g.:
  ```
  X | O | 3
  ---------
  4 | X | 6
  ---------
  O | 8 | 9
  ```
- When `includeMeta` is true, append a line like `Current: X (move 5)` to aid AI parsing.
- `reset(): void` (optional) clears the board for another round.

## Move Representation
- `type Move = { row: number; column: number; index: number }`.
- `index = row * columns + column` ensures compatibility with flat storage and matches the board numbering.
- Helper `isValidMove(move: Move): boolean` to gate UI interactions; uses bounds checking and emptiness.

## Winning Condition Logic
- Parameterize `winLength` so larger boards (e.g., 4×4, 5×5) can still use the same class.
- Row scan: sliding window across each row comparing sequential marks.
- Column scan: similar sliding window with step `columns`.
- Diagonals: handle both primary (`row + 1`, `column + 1`) and secondary (`row + 1`, `column - 1`) diagonals.
- Stop early when remaining cells cannot satisfy `winLength` to keep checks performant.

## ASCII Output Considerations
- Provide optional headers for row/column indices to aid debugging (toggle via parameter).
- Display empty cells as sequential 1-based ids (`1…rows*columns`) scanning left-to-right, top-to-bottom.
- Ensure deterministic spacing so models receive consistent tokens.
- Include current player and move count metadata appended to the text snippet.

## Integration Hooks
- Board instances live in context or route-level state so arena components can subscribe.
- Expose pure helpers (`serializeBoard`, `deserializeBoard`) to bridge with backend payloads.
- Future: share board snapshots with telemetry panel and move log for richer history.

## Next Questions
- Confirm mutation-only approach covers undo/history through external snapshots.
- Do we need support for variable win lengths (e.g., Gomoku rules) beyond `min(rows, columns)`?
- How should AI consume the ASCII: minimal grid only, or include metadata headers?
- Where to centralize player enumeration so UI, telemetry, and board logic stay in sync?
