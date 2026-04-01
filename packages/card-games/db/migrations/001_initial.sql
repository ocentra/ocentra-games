-- Schema version: 1
-- Super DB: games index + full content, game_names (derived from primary + alsoKnownAs)
-- Single source: processed-games/*.json (no Pagat list)

CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
INSERT INTO schema_version VALUES (1);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  source_file TEXT NOT NULL,
  primary_name TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  origin TEXT,
  player_mode TEXT,
  players_min INTEGER,
  players_max INTEGER,
  players_display TEXT,
  deck TEXT,
  deck_type TEXT,
  suit_set TEXT,
  rank_set TEXT,
  difficulty TEXT,
  duration TEXT,
  quality TEXT,
  schema_version TEXT,
  engine_model_version TEXT,
  has_engine INTEGER NOT NULL DEFAULT 0,
  phase_count INTEGER,
  has_player_actions INTEGER NOT NULL DEFAULT 0,
  has_zones INTEGER NOT NULL DEFAULT 0,
  overview_complete INTEGER NOT NULL DEFAULT 0,
  history_complete INTEGER NOT NULL DEFAULT 0,
  setup_complete INTEGER NOT NULL DEFAULT 0,
  rules_complete INTEGER NOT NULL DEFAULT 0,
  strategy_complete INTEGER NOT NULL DEFAULT 0,
  variations_complete INTEGER NOT NULL DEFAULT 0,
  ai_complete INTEGER NOT NULL DEFAULT 0,
  sources_complete INTEGER NOT NULL DEFAULT 0,
  completeness JSON,
  source_url TEXT,
  tags JSON,
  also_known_as JSON,
  validation_status TEXT,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_names (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_quality ON games(quality);
CREATE INDEX IF NOT EXISTS idx_games_player_mode ON games(player_mode);
CREATE INDEX IF NOT EXISTS idx_games_deck_type ON games(deck_type);
CREATE INDEX IF NOT EXISTS idx_games_source_file ON games(source_file);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_game_names_display_name ON game_names(display_name);
CREATE INDEX IF NOT EXISTS idx_game_names_slug ON game_names(slug);
