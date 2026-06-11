-- PromptForge database schema
-- Compatible with both PGlite (browser / WASM) and PostgreSQL (local dev).

-- ---------------------------------------------------------------------------
-- Trigger function: keep updated_at current on every UPDATE to prompts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Table: prompts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompts (
  id         SERIAL      PRIMARY KEY,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  version    INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER prompts_set_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: variables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variables (
  id            SERIAL  PRIMARY KEY,
  prompt_id     INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  default_value TEXT,
  UNIQUE (prompt_id, name)
);

-- ---------------------------------------------------------------------------
-- Table: tags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL PRIMARY KEY,
  name TEXT   NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------------
-- Table: prompt_tags  (join table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);
