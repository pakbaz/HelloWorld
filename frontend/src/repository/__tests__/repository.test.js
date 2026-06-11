const test = require('node:test');
const assert = require('node:assert/strict');

const { HttpRepository } = require('../httpRepository');
const { PGliteRepository } = require('../pgliteRepository');
const { createRepository } = require('../index');

test('createRepository selects HttpRepository by default', () => {
  const repo = createRepository({ fetchImpl: async () => ({ ok: true, json: async () => [] }) });
  assert.equal(repo instanceof HttpRepository, true);
});

test('createRepository selects PGliteRepository when backend is pglite', () => {
  const db = { query: async () => ({ rows: [] }) };
  const repo = createRepository({ backend: 'pglite', db });
  assert.equal(repo instanceof PGliteRepository, true);
});

test('HttpRepository savePrompt chooses POST for new prompt and PUT for update', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const repo = new HttpRepository({ baseUrl: 'http://localhost:9000/', fetchImpl });
  await repo.savePrompt({ title: 'A', body: 'B' });
  await repo.savePrompt({ id: 7, title: 'A2', body: 'B2' });

  assert.equal(calls[0].url, 'http://localhost:9000/prompts');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[1].url, 'http://localhost:9000/prompts/7');
  assert.equal(calls[1].options.method, 'PUT');
});

test('PGliteRepository exposes contract methods and uses SQL on prompt save', async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      if (sql.includes('INSERT INTO prompts')) {
        return { rows: [{ id: 1, title: params[0], body: params[1], version: 1 }] };
      }
      return { rows: [] };
    },
  };

  const repo = new PGliteRepository({ db });
  const saved = await repo.savePrompt({ title: 'T', body: 'B' });

  for (const fn of [
    'getPrompts',
    'savePrompt',
    'deletePrompt',
    'getVariables',
    'saveVariables',
    'deleteVariable',
    'getTags',
    'saveTag',
    'deleteTag',
    'setPromptTags',
  ]) {
    assert.equal(typeof repo[fn], 'function');
  }

  assert.equal(saved.title, 'T');
  assert.equal(seen.some((entry) => entry.sql.includes('INSERT INTO prompts')), true);
});
