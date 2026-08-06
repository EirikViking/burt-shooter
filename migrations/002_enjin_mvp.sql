-- Additive Enjin MVP campaign tables. This never touches game_highscores.
CREATE TABLE IF NOT EXISTS enjin_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  collection_url TEXT NOT NULL,
  owner_profile_url TEXT NOT NULL,
  target_score INTEGER NOT NULL,
  mode TEXT NOT NULL,
  mock_mode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enjin_identities (
  identity_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  assignment_id INTEGER
);

CREATE TABLE IF NOT EXISTS enjin_runs (
  run_id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  build_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ticket TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER NOT NULL DEFAULT 0,
  raw_crossing_score INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enjin_run_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  score INTEGER NOT NULL,
  sector INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  digest TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enjin_claim_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  claim_ciphertext TEXT NOT NULL,
  claim_fingerprint TEXT NOT NULL UNIQUE,
  token_name TEXT,
  image_url TEXT,
  collection_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  assigned_identity TEXT,
  assigned_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enjin_reward_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  identity_id TEXT NOT NULL UNIQUE,
  claim_id INTEGER NOT NULL UNIQUE,
  token_name TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'CLAIM AVAILABLE',
  opened_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enjin_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  identity_id TEXT,
  event_name TEXT NOT NULL,
  placement TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enjin_claim_inventory_status
  ON enjin_claim_inventory(campaign_id, status);
