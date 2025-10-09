CREATE TABLE IF NOT EXISTS kanban_boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT,
  icon TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  wip_limit INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date TEXT,
  attachments TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS kanban_tags (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS kanban_card_tags (
  card_id TEXT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES kanban_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE IF NOT EXISTS kanban_activity (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES kanban_cards(id) ON DELETE SET NULL,
  column_id TEXT REFERENCES kanban_columns(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  board_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_columns_board_position ON kanban_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_board_position ON kanban_cards(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_column_position ON kanban_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_activity_board_created ON kanban_activity(board_id, created_at DESC);
