DROP INDEX "recent_matches_model_match_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "recent_matches_model_match_unique" ON "recent_matches" USING btree ("model_id","match_id","round_id");