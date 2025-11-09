import { z } from 'zod'

const modelIdentifierSchema = z
  .string()
  .min(1, 'model identifier must not be empty')
  .max(128, 'model identifier too long')
  .or(z.literal(''))
  .nullable()
  .transform((value) => (value === '' || value === null ? null : value))

const moveSchema = z.object({
  turnIndex: z
    .number()
    .int('turnIndex must be an integer')
    .min(0, 'turnIndex must be positive'),
  cell: z.number().int('cell must be an integer').min(0),
  symbol: z.enum(['X', 'O']),
  elapsedMs: z
    .number()
    .int('elapsedMs must be an integer')
    .min(0, 'elapsedMs must be >= 0'),
})

const baseRoundResultSchema = z.object({
  matchId: z.string().uuid('matchId must be a UUID').optional(),
  roundId: z.string().uuid('roundId must be a UUID').optional(),
  playerOneModel: modelIdentifierSchema,
  playerTwoModel: modelIdentifierSchema,
  boardSize: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  currentRound: z.number().int().min(1),
  totalRounds: z.number().int().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().int().min(0),
  outcome: z.enum(['win', 'loss', 'draw']),
  winner: z.enum(['player1', 'player2', 'draw']),
  moves: z.array(moveSchema),
  rematchRequested: z.boolean(),
})

export const roundResultSchema = baseRoundResultSchema.superRefine(
  (value, ctx) => {
    if (value.moves.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'moves array must contain at least one entry',
        path: ['moves'],
      })
    }

    if (value.totalRounds < value.currentRound) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentRound cannot exceed totalRounds',
        path: ['currentRound'],
      })
    }

    const maxCells = value.boardSize * value.boardSize
    value.moves.forEach((move, index) => {
      if (move.cell >= maxCells) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `cell must be < ${maxCells} for boardSize ${value.boardSize}`,
          path: ['moves', index, 'cell'],
        })
      }
    })

    const sorted = [...value.moves].sort((a, b) => a.turnIndex - b.turnIndex)
    sorted.forEach((move, index) => {
      if (move.turnIndex !== index) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'moves must be contiguous starting from turnIndex 0',
          path: ['moves', index, 'turnIndex'],
        })
      }
    })
  },
)

export type RoundResultPayload = z.infer<typeof roundResultSchema>

export const roundResultResponseSchema = z.object({
  matchId: z.string().uuid(),
  roundId: z.string().uuid(),
  moveCount: z.number().int().min(0),
  persistedAt: z.string(),
  idempotent: z.boolean(),
})

export type RoundResultResponse = z.infer<typeof roundResultResponseSchema>
