import { initDb } from '../db/index';
import { HttpRepository } from './httpRepository';
import { PGliteRepository } from './pgliteRepository';
import type { IRepository } from './types';

export type { IRepository, Prompt, Variable, Tag, PromptVersion } from './types';
export { HttpRepository } from './httpRepository';
export { PGliteRepository } from './pgliteRepository';

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
