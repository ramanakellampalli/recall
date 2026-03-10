import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, parseDSL } from '../search.js';

// ─── parseDSL ────────────────────────────────────────────────────

test('parseDSL: plain query returns query with no filters', () => {
  const result = parseDSL('docker restart');
  assert.equal(result.query, 'docker restart');
  assert.deepEqual(result.filters, {});
});

test('parseDSL: extracts tag filter', () => {
  const result = parseDSL('tag:docker restart');
  assert.equal(result.query, 'restart');
  assert.equal(result.filters.tag, 'docker');
});

test('parseDSL: extracts repo filter', () => {
  const result = parseDSL('repo:payments error');
  assert.equal(result.query, 'error');
  assert.equal(result.filters.repo, 'payments');
});

test('parseDSL: extracts after filter', () => {
  const result = parseDSL('after:1h deploy');
  assert.equal(result.query, 'deploy');
  assert.equal(result.filters.after, '1h');
});

test('parseDSL: handles combined filters', () => {
  const result = parseDSL('tag:aws repo:infra after:2d deploy');
  assert.equal(result.query, 'deploy');
  assert.equal(result.filters.tag, 'aws');
  assert.equal(result.filters.repo, 'infra');
  assert.equal(result.filters.after, '2d');
});

test('parseDSL: empty string returns empty query and filters', () => {
  const result = parseDSL('');
  assert.equal(result.query, '');
  assert.deepEqual(result.filters, {});
});

test('parseDSL: short alias t: works for tag', () => {
  const result = parseDSL('t:docker');
  assert.equal(result.filters.tag, 'docker');
});

// ─── search ──────────────────────────────────────────────────────

const fixtures = [
  {
    id: '1',
    command: 'docker system prune -af',
    description: 'Clean all Docker caches',
    tags: ['docker', 'cleanup'],
    context: { gitRepo: 'infra', gitBranch: 'main' },
    useCount: 5,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    command: 'kubectl get pods -n production',
    description: 'List production pods',
    tags: ['k8s', 'pods'],
    context: { gitRepo: 'payments', gitBranch: 'main' },
    useCount: 2,
    lastUsedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    command: 'pg_dump -U admin proddb > backup.sql',
    description: 'Dump production database',
    tags: ['postgres', 'backup'],
    context: { gitRepo: 'payments', gitBranch: 'main' },
    useCount: 1,
    lastUsedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

test('search: matches by command text', () => {
  const results = search(fixtures, 'docker');
  assert.equal(results[0].id, '1');
});

test('search: matches by description', () => {
  const results = search(fixtures, 'database');
  assert.ok(results.some(r => r.id === '3'));
});

test('search: matches by tag', () => {
  const results = search(fixtures, 'k8s');
  assert.ok(results.some(r => r.id === '2'));
});

test('search: filters by tag option', () => {
  const results = search(fixtures, '', { tag: 'postgres' });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, '3');
});

test('search: filters by repo option', () => {
  const results = search(fixtures, '', { repo: 'payments' });
  assert.equal(results.length, 2);
  assert.ok(results.every(r => ['2', '3'].includes(r.id)));
});

test('search: returns empty array when nothing matches', () => {
  const results = search(fixtures, 'zzznomatch');
  assert.equal(results.length, 0);
});

test('search: with empty query returns all snippets sorted by frecency', () => {
  const results = search(fixtures, '');
  assert.equal(results.length, 3);
  // Snippet 1 has highest useCount and was used most recently
  assert.equal(results[0].id, '1');
});

test('search: handles empty snippet list', () => {
  const results = search([], 'docker');
  assert.deepEqual(results, []);
});
