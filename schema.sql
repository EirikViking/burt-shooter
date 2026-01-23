-- Database schema for BURT SHOOTER highscores

CREATE TABLE IF NOT EXISTS game_highscores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  wallet_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_score ON game_highscores(score DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON game_highscores(created_at DESC);
