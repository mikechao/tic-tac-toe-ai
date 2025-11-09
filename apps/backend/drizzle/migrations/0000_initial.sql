CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "round_id" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "player_one_model" text NOT NULL,
  "player_two_model" text NOT NULL,
  "opponent_type" text NOT NULL,
  "difficulty" text,
  "board_size" integer NOT NULL,
  "current_round" integer NOT NULL,
  "total_rounds" integer NOT NULL,
  "started_at" timestamptz NOT NULL,
  "finished_at" timestamptz NOT NULL,
  "rematch_requested" boolean NOT NULL,
  "ai_model_version" text,
  "outcome" text NOT NULL,
  "winner_slot" text NOT NULL,
  "duration_ms" integer NOT NULL,
  "recap_hash" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "moves" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "round_id" uuid NOT NULL REFERENCES "matches"("round_id") ON DELETE CASCADE,
  "turn_index" integer NOT NULL,
  "cell" integer NOT NULL,
  "symbol" text NOT NULL,
  "elapsed_ms" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "moves_match_turn_unique" ON "moves" ("match_id", "turn_index");
