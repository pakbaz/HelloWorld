const { HttpRepository } = require('./httpRepository');
const { PGliteRepository } = require('./pgliteRepository');
require('./repository.interface');

function resolveBackend(explicitBackend) {
  const backend =
    explicitBackend ||
    process.env.REPOSITORY_BACKEND ||
    process.env.VITE_REPOSITORY_BACKEND ||
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

const repository = createRepository();

module.exports = {
  createRepository,
  repository,
  resolveBackend,
  HttpRepository,
  PGliteRepository,
};
