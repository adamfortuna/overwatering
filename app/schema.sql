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

-- Utah's Weekly Lawn Watering Guide, parsed. Cloudflare can't always reach wateringindex.utah.gov,
-- so a GitHub Action (and the Worker, when it can) pushes each week's page here.
CREATE TABLE IF NOT EXISTS guide (
  kind TEXT PRIMARY KEY,
  week TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  counties TEXT NOT NULL,
  fetched TEXT NOT NULL
);
