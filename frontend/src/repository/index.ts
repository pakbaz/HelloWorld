import { initDb } from '../db/index';
// Use explicit `.ts` extensions: stale `.js` duplicates of these modules exist
// (consumed by the Node test suite) and expose a different constructor API.
// Without the extension Vite resolves the `.js` files, which breaks the app at
// runtime ("PGliteRepository requires a db client with a query(...) method").
import { HttpRepository } from './httpRepository.ts';
import { PGliteRepository } from './pgliteRepository.ts';
import type { IRepository } from './types';

export type { IRepository, Prompt, Variable, Tag, PromptVersion } from './types';
export { HttpRepository } from './httpRepository.ts';
export { PGliteRepository } from './pgliteRepository.ts';

let _repository: IRepository | null = null;

export async function getRepository(): Promise<IRepository> {
  if (_repository) return _repository;

  const mode = import.meta.env.VITE_REPOSITORY_MODE ?? 'http';

  if (mode === 'pglite') {
    const db = await initDb();
    _repository = new PGliteRepository(db);
  } else {
    _repository = new HttpRepository(import.meta.env.VITE_API_BASE_URL ?? '/api');
  }

  return _repository;
}
