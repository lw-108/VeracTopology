-- ============================================================================
-- Postgres Schema: entities table
-- IoT Cyber Security Mesh — VeracTopology
-- ============================================================================
-- This table is the single source of truth for all entity data.
-- Neo4j stores only node IDs and relationships for graph traversal.
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
  id         TEXT PRIMARY KEY,                -- Matches Neo4j Entity.id
  label      TEXT NOT NULL,                   -- Display label (e.g. 'SOC CORE')
  kind       TEXT NOT NULL
               CHECK (kind IN ('core', 'pillar', 'agent', 'task', 'tool', 'human')),
  val        INTEGER NOT NULL DEFAULT 10,     -- Node visual weight/size
  color      TEXT,                            -- Optional override color hex
  status     TEXT,                            -- Operational status string
  detail     TEXT,                            -- Long-form description
  metadata   JSONB DEFAULT '{}',             -- Extensible metadata bag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The PRIMARY KEY on `id` already creates a btree index.
-- Verify with: SELECT * FROM pg_indexes WHERE tablename = 'entities';

-- Optional: index on kind for filtered queries
CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities (kind);

-- Optional: trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
