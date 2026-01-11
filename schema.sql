-- Database schema for BURT SHOOTER highscores

CREATE TABLE IF NOT EXISTS game_highscores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_score ON game_highscores(score DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON game_highscores(created_at DESC);

-- Insert some test data
INSERT INTO game_highscores (name, score, level, created_at) VALUES
  ('KURT', 15000, 8, datetime('now')),
  ('EIRIK', 12000, 7, datetime('now')),
  ('MELBU', 9500, 6, datetime('now')),
  ('STOKMARK', 7500, 5, datetime('now')),
  ('GRIS', 5000, 4, datetime('now'));
