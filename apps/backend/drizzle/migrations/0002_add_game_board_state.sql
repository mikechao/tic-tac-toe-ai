ALTER TABLE "games"
  ADD COLUMN "board_state" jsonb NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]'::jsonb,
  ALTER COLUMN "winner" SET NOT NULL;

UPDATE "games"
SET "board_state" = '[null,null,null,null,null,null,null,null,null]'::jsonb
WHERE "board_state" IS NULL;

ALTER TABLE "games"
  ALTER COLUMN "board_state" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "moves_game_position_unique" ON "moves" ("game_id", "position");
