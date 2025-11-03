export {
  createMatchRequestSchema as createMatchSchema,
  createGameRequestSchema as createGameSchema,
  createMoveRequestSchema as createMoveSchema,
  gameParamsSchema,
  matchParamsSchema,
  matchStatusResourceSchema,
  gameResourceSchema,
  moveResourceSchema,
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
} from '@arena/schema'
