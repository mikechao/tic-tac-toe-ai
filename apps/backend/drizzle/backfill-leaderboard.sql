-- Backfill leaderboard data from existing matches
-- This processes existing matches to populate the leaderboard tables

-- Insert model stats for Gemini Nano (Chrome Built-In)
INSERT INTO "model_stats" (model_id, model_version, total_matches, wins, losses, ties, average_turns, current_streak_type, current_streak_length)
SELECT
  1 as model_id,
  'Gemini Nano (Chrome Built-In)' as model_version,
  COUNT(*) as total_matches,
  SUM(CASE WHEN winner_slot = 'player1' THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN winner_slot = 'player2' THEN 1 ELSE 0 END) as losses,
  SUM(CASE WHEN winner_slot = 'draw' THEN 1 ELSE 0 END) as ties,
  ROUND(AVG(move_count), 2) as average_turns,
  CASE
    WHEN winner_slot = 'player1' THEN 'win'
    WHEN winner_slot = 'player2' THEN 'loss'
    ELSE 'tie'
  END as current_streak_type,
  1 as current_streak_length
FROM matches m
LEFT JOIN (
  SELECT round_id, COUNT(*) as move_count
  FROM moves
  GROUP BY round_id
) mc ON m.round_id = mc.round_id
WHERE player_one_model = 'Gemini Nano (Chrome Built-In)'
GROUP BY player_one_model, winner_slot
ORDER BY created_at DESC
LIMIT 1;

-- Insert model stats for SmolLM2 360M Instruct (Transformers.js (WebGPU))
INSERT INTO "model_stats" (model_id, model_version, total_matches, wins, losses, ties, average_turns, current_streak_type, current_streak_length)
SELECT
  2 as model_id,
  'SmolLM2 360M Instruct (Transformers.js (WebGPU))' as model_version,
  COUNT(*) as total_matches,
  SUM(CASE WHEN winner_slot = 'player2' THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN winner_slot = 'player1' THEN 1 ELSE 0 END) as losses,
  SUM(CASE WHEN winner_slot = 'draw' THEN 1 ELSE 0 END) as ties,
  ROUND(AVG(move_count), 2) as average_turns,
  CASE
    WHEN winner_slot = 'player2' THEN 'win'
    WHEN winner_slot = 'player1' THEN 'loss'
    ELSE 'tie'
  END as current_streak_type,
  1 as current_streak_length
FROM matches m
LEFT JOIN (
  SELECT round_id, COUNT(*) as move_count
  FROM moves
  GROUP BY round_id
) mc ON m.round_id = mc.round_id
WHERE player_two_model = 'SmolLM2 360M Instruct (Transformers.js (WebGPU))'
GROUP BY player_two_model, winner_slot
ORDER BY created_at DESC
LIMIT 1;