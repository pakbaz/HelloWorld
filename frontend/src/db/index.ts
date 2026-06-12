import { PGlite } from '@electric-sql/pglite';
import schemaSql from './schema.sql?raw';

/**
 * Singleton PGlite instance persisted to IndexedDB under the key "promptforge".
 * On first load the schema is applied with IF NOT EXISTS guards so subsequent
 * page loads are safe to call `initDb` again without data loss.
 */
let _db: PGlite | null = null;

/**
 * Returns the initialised PGlite database, creating and migrating it on the
 * first call.  Subsequent calls return the cached instance.
 */
export async function initDb(): Promise<PGlite> {
  if (_db) return _db;

  // PGlite's bundled WASM runtime references Node's global `process` in a few
  // code paths that upstream guards with `globalThis.process?.env`. Vite strips
  // those guards during the production build, so in the browser the references
  // throw "process is not defined". Provide a minimal shim before instantiating
  // PGlite. It deliberately omits `versions.node`, so Emscripten still detects a
  // browser environment.
  const globalScope = globalThis as typeof globalThis & {
    process?: { env: Record<string, unknown> };
  };
  if (typeof globalScope.process === 'undefined') {
    globalScope.process = { env: {} };
  }

  _db = new PGlite('idb://promptforge');
  await _db.exec(schemaSql);

  return _db;
}

/**
 * Returns the current database instance.
 * Throws if `initDb` has not been called yet.
 */
export function getDb(): PGlite {
  if (!_db) {
    throw new Error('Database has not been initialised. Call initDb() first.');
  }
  return _db;
}
