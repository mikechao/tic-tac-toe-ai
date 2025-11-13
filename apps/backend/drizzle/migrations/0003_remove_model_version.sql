-- Remove model_version columns to eliminate duplicate entries and simplify schema
-- This migration consolidates model stats by model_id only, using the clean model registry for display

-- Drop old unique indexes that included model_version
DROP INDEX IF EXISTS "model_stats_model_id_version_unique";
DROP INDEX IF EXISTS "recent_matches_model_version_index_unique";
DROP INDEX IF EXISTS "recent_matches_model_version_match_unique";

-- Remove model_version columns from both tables
ALTER TABLE model_stats DROP COLUMN IF EXISTS model_version;
ALTER TABLE recent_matches DROP COLUMN IF EXISTS model_version;
ALTER TABLE recent_matches DROP COLUMN IF EXISTS opponent_model_version;

-- Create new simplified unique indexes
CREATE UNIQUE INDEX "model_stats_model_id_unique" ON model_stats (model_id);
CREATE UNIQUE INDEX "recent_matches_model_index_unique" ON recent_matches (model_id, match_index);
CREATE UNIQUE INDEX "recent_matches_model_match_unique" ON recent_matches (model_id, match_id);

-- Clean up duplicate data by aggregating model stats
DELETE FROM model_stats WHERE id NOT IN (
  SELECT DISTINCT ON (model_id) id
  FROM model_stats
  ORDER BY model_id, last_updated_at DESC
);

-- Clean up duplicate recent matches (keep most recent for each model_id + match_index)
DELETE FROM recent_matches WHERE id NOT IN (
  SELECT DISTINCT ON (model_id, match_index) id
  FROM recent_matches
  ORDER BY model_id, match_index, played_at DESC
);