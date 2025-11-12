-- Migration: Add leaderboard summary tables
-- These tables track model statistics and recent matches for the leaderboard

-- Create model_stats table to track overall statistics per model version
CREATE TABLE IF NOT EXISTS "model_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
	"model_version" varchar(255) NOT NULL,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"ties" integer DEFAULT 0 NOT NULL,
	"average_turns" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"current_streak_type" varchar(10) DEFAULT 'win' NOT NULL,
	"current_streak_length" integer DEFAULT 0 NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create unique constraint for model stats
CREATE UNIQUE INDEX IF NOT EXISTS "model_stats_model_id_version_unique" ON "model_stats" ("model_id", "model_version");

-- Create recent_matches table to track last 5 matches per model version
CREATE TABLE IF NOT EXISTS "recent_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
	"model_version" varchar(255) NOT NULL,
	"match_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"result" varchar(1) NOT NULL,
	"opponent_model_id" integer,
	"opponent_model_version" varchar(255),
	"played_at" timestamp with time zone NOT NULL,
	"match_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for recent matches
CREATE UNIQUE INDEX IF NOT EXISTS "recent_matches_model_version_index_unique" ON "recent_matches" ("model_id", "model_version", "match_index");
CREATE UNIQUE INDEX IF NOT EXISTS "recent_matches_model_version_match_unique" ON "recent_matches" ("model_id", "model_version", "match_id");