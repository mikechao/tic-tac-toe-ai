CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"round_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"player_one_model" text NOT NULL,
	"player_two_model" text NOT NULL,
	"opponent_type" text NOT NULL,
	"difficulty" text,
	"board_size" integer NOT NULL,
	"current_round" integer NOT NULL,
	"total_rounds" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"rematch_requested" boolean NOT NULL,
	"ai_model_version" text,
	"outcome" text NOT NULL,
	"winner_slot" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"recap_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_round_id_unique" UNIQUE("round_id")
);
--> statement-breakpoint
CREATE TABLE "model_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"turn_index" integer NOT NULL,
	"cell" integer NOT NULL,
	"symbol" text NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recent_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
	"match_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"result" varchar(1) NOT NULL,
	"opponent_model_id" integer,
	"played_at" timestamp with time zone NOT NULL,
	"match_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_round_id_matches_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."matches"("round_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_recap_hash_unique" ON "matches" USING btree ("recap_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_match_round_unique" ON "matches" USING btree ("match_id","current_round");--> statement-breakpoint
CREATE UNIQUE INDEX "model_stats_model_id_unique" ON "model_stats" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "moves_round_turn_unique" ON "moves" USING btree ("round_id","turn_index");--> statement-breakpoint
CREATE UNIQUE INDEX "recent_matches_model_index_unique" ON "recent_matches" USING btree ("model_id","match_index");--> statement-breakpoint
CREATE UNIQUE INDEX "recent_matches_model_match_unique" ON "recent_matches" USING btree ("model_id","match_id");