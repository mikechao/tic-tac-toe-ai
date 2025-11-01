CREATE TABLE IF NOT EXISTS "models" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "provider" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "matches" (
  "id" serial PRIMARY KEY,
  "model_a_id" integer NOT NULL REFERENCES "models"("id"),
  "model_b_id" integer NOT NULL REFERENCES "models"("id"),
  "total_rounds" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "games" (
  "id" serial PRIMARY KEY,
  "match_id" integer NOT NULL REFERENCES "matches"("id"),
  "round" integer NOT NULL,
  "winner" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "moves" (
  "id" serial PRIMARY KEY,
  "game_id" integer NOT NULL REFERENCES "games"("id"),
  "move_index" integer NOT NULL,
  "position" integer NOT NULL,
  "actor" text NOT NULL,
  "reasoning" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "leaderboard_stats" (
  "id" serial PRIMARY KEY,
  "model_id" integer NOT NULL UNIQUE REFERENCES "models"("id"),
  "wins" integer DEFAULT 0 NOT NULL,
  "losses" integer DEFAULT 0 NOT NULL,
  "ties" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "matches_models_unique" ON "matches" ("model_a_id", "model_b_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "games_match_round_unique" ON "games" ("match_id", "round");
CREATE UNIQUE INDEX IF NOT EXISTS "moves_game_move_idx_unique" ON "moves" ("game_id", "move_index");
