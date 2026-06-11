import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HttpRepository } from '../httpRepository.js';
import { PGliteRepository } from '../pgliteRepository.js';
import { createRepository } from '../index.js';

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
    'getVersions',
    'restoreVersion',
  ]) {
    assert.equal(typeof repo[fn], 'function');
  }

  assert.equal(saved.title, 'T');
  assert.equal(seen.some((entry) => entry.sql.includes('INSERT INTO prompts')), true);
  // Snapshot must also be written on every save (FR-11)
  assert.equal(seen.some((entry) => entry.sql.includes('INSERT INTO prompt_versions')), true);
});

test('PGliteRepository.savePrompt writes immutable snapshot for new prompt', async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      if (sql.includes('INSERT INTO prompts')) {
        return { rows: [{ id: 5, title: params[0], body: params[1], version: 1 }] };
      }
      return { rows: [] };
    },
  };

  const repo = new PGliteRepository({ db });
  await repo.savePrompt({ title: 'New', body: 'Body' });

  const snapshotCall = seen.find((e) => e.sql.includes('INSERT INTO prompt_versions'));
  assert.ok(snapshotCall, 'snapshot INSERT must be called');
  assert.equal(snapshotCall.params[0], 5);   // prompt_id
  assert.equal(snapshotCall.params[1], 1);   // version
  assert.equal(snapshotCall.params[2], 'New'); // title
  assert.equal(snapshotCall.params[3], 'Body'); // body
});

test('PGliteRepository.savePrompt writes immutable snapshot on update', async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      if (sql.includes('UPDATE prompts')) {
        return { rows: [{ id: 3, title: params[0], body: params[1], version: 2 }] };
      }
      return { rows: [] };
    },
  };

  const repo = new PGliteRepository({ db });
  await repo.savePrompt({ id: 3, title: 'Updated', body: 'New body' });

  const snapshotCall = seen.find((e) => e.sql.includes('INSERT INTO prompt_versions'));
  assert.ok(snapshotCall, 'snapshot INSERT must be called on update');
  assert.equal(snapshotCall.params[0], 3);       // prompt_id
  assert.equal(snapshotCall.params[1], 2);       // incremented version
});

test('PGliteRepository.getVersions queries prompt_versions ordered by version DESC', async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      return { rows: [] };
    },
  };

  const repo = new PGliteRepository({ db });
  await repo.getVersions(42);

  const call = seen.find((e) => e.sql.includes('prompt_versions'));
  assert.ok(call, 'should query prompt_versions');
  assert.ok(call.sql.includes('ORDER BY version DESC'));
  assert.deepEqual(call.params, [42]);
});

test('PGliteRepository.restoreVersion applies the snapshot via savePrompt', async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      if (sql.includes('SELECT title, body FROM prompt_versions')) {
        return { rows: [{ title: 'Old Title', body: 'Old Body' }] };
      }
      if (sql.includes('UPDATE prompts')) {
        return { rows: [{ id: 10, title: params[0], body: params[1], version: 5 }] };
      }
      return { rows: [] };
    },
  };

  const repo = new PGliteRepository({ db });
  const result = await repo.restoreVersion(10, 99);

  assert.equal(result.title, 'Old Title');
  assert.equal(result.body, 'Old Body');
  // A new snapshot should be written after restore
  assert.equal(seen.some((e) => e.sql.includes('INSERT INTO prompt_versions')), true);
});

test('HttpRepository.getVersions calls the correct endpoint', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => [] };
  };

  const repo = new HttpRepository({ baseUrl: 'http://localhost:9000', fetchImpl });
  await repo.getVersions(7);

  assert.equal(calls[0].url, 'http://localhost:9000/prompts/7/versions');
});

test('HttpRepository.restoreVersion calls the correct endpoint', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ id: 7, version: 3 }) };
  };

  const repo = new HttpRepository({ baseUrl: 'http://localhost:9000', fetchImpl });
  await repo.restoreVersion(7, 12);

  assert.equal(calls[0].url, 'http://localhost:9000/prompts/7/versions/12/restore');
  assert.equal(calls[0].options.method, 'POST');
});
