import { HttpRepository } from './httpRepository.js';
import { PGliteRepository } from './pgliteRepository.js';
import './repository.interface.js';

function resolveBackend(explicitBackend) {
  const backend =
    explicitBackend ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_REPOSITORY_BACKEND
      : undefined) ||
    'http';

  return String(backend).toLowerCase();
}

function createRepository({ backend, httpBaseUrl, db, fetchImpl } = {}) {
  const resolvedBackend = resolveBackend(backend);

  if (resolvedBackend === 'pglite') {
    return new PGliteRepository({ db });
  }

  return new HttpRepository({
    baseUrl: httpBaseUrl,
    fetchImpl,
  });
}

export {
  createRepository,
  resolveBackend,
  HttpRepository,
  PGliteRepository,
};
