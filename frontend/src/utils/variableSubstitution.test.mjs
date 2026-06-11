import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialValues,
  extractUniqueVariables,
  substituteVariables,
} from './variableSubstitution.js';

test('extractUniqueVariables returns unique names in appearance order', () => {
  const prompt = 'Hi {{name}}, meet {{ role }} and {{name}} again';
  assert.deepEqual(extractUniqueVariables(prompt), ['name', 'role']);
});

test('buildInitialValues pre-populates defaults from Variables table rows', () => {
  const prompt = '{{name}} {{role}} {{team}}';
  const variables = [
    { name: 'name', default_value: 'Ada' },
    { name: 'role', default_value: 'Engineer' },
  ];

  assert.deepEqual(buildInitialValues(prompt, variables), {
    name: 'Ada',
    role: 'Engineer',
    team: '',
  });
});

test('substituteVariables performs full replacement in real time from values', () => {
  const prompt = 'Hello {{name}}! You are a {{ role }}.';
  const rendered = substituteVariables(prompt, { name: 'Sam', role: 'Tester' });

  assert.equal(rendered, 'Hello Sam! You are a Tester.');
});
