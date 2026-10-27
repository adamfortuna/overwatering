CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset TEXT NOT NULL,
  parcel_id TEXT NOT NULL,
  region_index INTEGER NOT NULL,
  cls TEXT NOT NULL,
  original_cls TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS labels_parcel ON labels(dataset, parcel_id, created_at);
