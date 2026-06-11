import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS prompts (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  version    INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS variables (
  id            SERIAL PRIMARY KEY,
  prompt_id     INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  default_value TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);
`;

export async function getDb(): Promise<PGlite> {
  if (db) return db;

  db = new PGlite('idb://promptforge');
  await db.exec(SCHEMA_SQL);

  return db;
}
