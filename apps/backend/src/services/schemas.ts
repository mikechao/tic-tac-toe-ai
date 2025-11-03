export {
  createMatchRequestSchema as createMatchSchema,
  createGameRequestSchema as createGameSchema,
  createMoveRequestSchema as createMoveSchema,
  gameParamsSchema,
  matchParamsSchema,
  matchStatusResourceSchema,
  gameResourceSchema,
  moveResourceSchema,
  leaderboardResponseSchema,
} from '@arena/schema'
export type {
  CreateMatchRequest as CreateMatchPayload,
  CreateGameRequest as CreateGamePayload,
  CreateMoveRequest as CreateMovePayload,
  MatchParams,
  GameParams,
  MatchStatusResource,
  GameResource,
  MoveResource,
  LeaderboardResponse,
  LeaderboardEntry,
} from '@arena/schema'
