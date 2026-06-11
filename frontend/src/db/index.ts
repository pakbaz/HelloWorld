/**
 * PGlite initialization and SQL query helpers.
 *
 * In production (GitHub Pages) this module boots an in-browser PGlite
 * instance backed by IndexedDB.  In local dev the repository layer
 * calls the FastAPI / Node.js backend over HTTP instead, so this file
 * is only loaded when the PGlite repository is active.
 */

// PGlite is installed as a dependency when the PGlite repository is used.
// Import lazily so the WASM bundle is not pulled into the HTTP-dev build.
let _db: unknown = null;

export async function getDb() {
  if (_db) return _db;

  // Dynamically import so bundlers can tree-shake this in the HTTP build.
  const { PGlite } = await import('@electric-sql/pglite');
  _db = new PGlite('idb://promptforge');
  await initSchema(_db as InstanceType<typeof PGlite>);
  return _db;
}

async function initSchema(db: { exec: (sql: string) => Promise<unknown> }) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id         SERIAL PRIMARY KEY,
      title      TEXT    NOT NULL,
      body       TEXT    NOT NULL DEFAULT '',
      version    INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS variables (
      id            SERIAL PRIMARY KEY,
      prompt_id     INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      default_value TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
      PRIMARY KEY (prompt_id, tag_id)
    );
  `);
}
