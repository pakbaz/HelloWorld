/**
 * Repository interface shared by both implementations.
 *
 * `HttpRepository`  – used during local development; proxies calls to the
 *                     FastAPI / Node.js backend.
 * `PGliteRepository` – used in the production GitHub Pages build; executes
 *                      SQL directly against the in-browser PGlite instance.
 *
 * The active implementation is chosen at build time via the
 * VITE_REPOSITORY_MODE environment variable:
 *   - "http"    → HttpRepository  (default for local dev)
 *   - "pglite"  → PGliteRepository (production static build)
 */

export interface Prompt {
  id: number;
  title: string;
  body: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface IRepository {
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: number): Promise<Prompt | null>;
  savePrompt(data: Omit<Prompt, 'id' | 'version' | 'created_at' | 'updated_at'>): Promise<Prompt>;
  updatePrompt(id: number, data: Partial<Pick<Prompt, 'title' | 'body'>>): Promise<Prompt>;
  deletePrompt(id: number): Promise<void>;
}

const mode = import.meta.env.VITE_REPOSITORY_MODE ?? 'http';

async function createRepository(): Promise<IRepository> {
  if (mode === 'pglite') {
    const { PGliteRepository } = await import('./pgliteRepository');
    return new PGliteRepository();
  }
  const { HttpRepository } = await import('./httpRepository');
  return new HttpRepository();
}

// Singleton promise — resolved once on first import.
let _repo: IRepository | null = null;

export async function getRepository(): Promise<IRepository> {
  if (!_repo) {
    _repo = await createRepository();
  }
  return _repo;
}
