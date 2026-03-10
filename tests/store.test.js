import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Use an isolated temp dir so tests never touch ~/.recall
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recall-test-'));
process.env.RECALL_DATA_DIR = tmpDir;

// Import after setting env so store picks up the temp path
const { addSnippet, getAll, removeSnippet, editSnippet, recordUse } = await import('../store.js');

function snippet(overrides = {}) {
  return {
    command: 'echo hello',
    description: 'Test snippet',
    tags: ['test'],
    context: null,
    ...overrides,
  };
}

beforeEach(() => {
  const file = path.join(tmpDir, 'snippets.json');
  if (fs.existsSync(file)) fs.unlinkSync(file);
});

afterEach(() => {
  const file = path.join(tmpDir, 'snippets.json');
  if (fs.existsSync(file)) fs.unlinkSync(file);
});

test('addSnippet: saves and returns snippet with id and timestamps', () => {
  const saved = addSnippet(snippet());
  assert.ok(saved.id);
  assert.ok(saved.createdAt);
  assert.ok(saved.lastUsedAt);
  assert.equal(saved.useCount, 0);
  assert.equal(saved.command, 'echo hello');
});

test('addSnippet: persists to disk', () => {
  addSnippet(snippet({ command: 'ls -la' }));
  const all = getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].command, 'ls -la');
});

test('getAll: returns empty array when no snippets saved', () => {
  const all = getAll();
  assert.deepEqual(all, []);
});

test('getAll: returns all saved snippets', () => {
  addSnippet(snippet({ command: 'cmd1' }));
  addSnippet(snippet({ command: 'cmd2' }));
  const all = getAll();
  assert.equal(all.length, 2);
});

test('removeSnippet: removes by id and returns true', () => {
  const saved = addSnippet(snippet());
  const ok = removeSnippet(saved.id);
  assert.equal(ok, true);
  assert.equal(getAll().length, 0);
});

test('removeSnippet: returns false for unknown id', () => {
  const ok = removeSnippet('nonexistent-id');
  assert.equal(ok, false);
});

test('editSnippet: updates fields and returns updated snippet', () => {
  const saved = addSnippet(snippet());
  const updated = editSnippet(saved.id, { description: 'Updated', tags: ['a', 'b'] });
  assert.equal(updated.description, 'Updated');
  assert.deepEqual(updated.tags, ['a', 'b']);
});

test('editSnippet: returns null for unknown id', () => {
  const result = editSnippet('nonexistent-id', { description: 'x' });
  assert.equal(result, null);
});

test('recordUse: increments useCount and sets lastUsedAt', () => {
  const saved = addSnippet(snippet());
  recordUse(saved.id);
  const all = getAll();
  assert.equal(all[0].useCount, 1);
  assert.ok(all[0].lastUsedAt);
});

test('recordUse: does nothing for unknown id', () => {
  addSnippet(snippet());
  recordUse('nonexistent-id');
  assert.equal(getAll()[0].useCount, 0);
});
