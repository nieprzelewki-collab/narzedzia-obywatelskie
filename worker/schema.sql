-- Kolejkomat D1 schema
CREATE TABLE IF NOT EXISTS alerty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  benefit TEXT NOT NULL,
  province TEXT NOT NULL,
  case_type INTEGER NOT NULL DEFAULT 1,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerty_grupa ON alerty (benefit, province, case_type);

CREATE TABLE IF NOT EXISTS snapshoty (
  benefit TEXT NOT NULL,
  province TEXT NOT NULL,
  case_type INTEGER NOT NULL,
  best_days INTEGER,
  best_label TEXT,
  best_provider TEXT,
  checked_at TEXT,
  PRIMARY KEY (benefit, province, case_type)
);

CREATE TABLE IF NOT EXISTS waitlista (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  narzedzie TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (email, narzedzie)
);

CREATE TABLE IF NOT EXISTS uzycia_urzedomat (
  ip_hash TEXT NOT NULL,
  dzien TEXT NOT NULL,
  licznik INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, dzien)
);

CREATE TABLE IF NOT EXISTS uzycia_czytomat (
  ip_hash TEXT NOT NULL,
  dzien TEXT NOT NULL,
  licznik INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, dzien)
);
