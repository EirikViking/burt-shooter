-- Migration: Add rank_index column to game_highscores
-- Run with: npx wrangler d1 execute burt-game-db --remote --file=./migrations/001_add_rank_index.sql

ALTER TABLE game_highscores ADD COLUMN rank_index INTEGER;

-- Create index for rank_index
CREATE INDEX IF NOT EXISTS idx_rank_index ON game_highscores(rank_index);
