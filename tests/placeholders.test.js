import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPlaceholders, substitutePlaceholder } from '../commands/utils/placeholders.js';

// ─── extractPlaceholders ─────────────────────────────────────────

test('extractPlaceholders: returns empty array when no placeholders', () => {
  assert.deepEqual(extractPlaceholders('docker system prune -af'), []);
});

test('extractPlaceholders: extracts a single placeholder', () => {
  assert.deepEqual(extractPlaceholders('kubectl logs {pod}'), ['pod']);
});

test('extractPlaceholders: extracts multiple placeholders', () => {
  assert.deepEqual(
    extractPlaceholders('kubectl logs {pod} -n {namespace}'),
    ['pod', 'namespace']
  );
});

test('extractPlaceholders: deduplicates repeated placeholders', () => {
  assert.deepEqual(
    extractPlaceholders('ssh {host} && scp file {host}:/tmp'),
    ['host']
  );
});

test('extractPlaceholders: preserves order of first appearance', () => {
  assert.deepEqual(
    extractPlaceholders('psql -U {user} -d {db} -h {host}'),
    ['user', 'db', 'host']
  );
});

test('extractPlaceholders: trims whitespace inside braces', () => {
  assert.deepEqual(extractPlaceholders('echo { name }'), ['name']);
});

test('extractPlaceholders: ignores empty braces', () => {
  assert.deepEqual(extractPlaceholders('echo {}'), []);
});

// ─── substitutePlaceholder ───────────────────────────────────────
// Values are shell-quoted to prevent injection (wrapped in single quotes)

test('substitutePlaceholder: replaces all occurrences', () => {
  const result = substitutePlaceholder('ssh {host} && ping {host}', 'host', 'prod.example.com');
  assert.equal(result, "ssh 'prod.example.com' && ping 'prod.example.com'");
});

test('substitutePlaceholder: replaces single occurrence', () => {
  const result = substitutePlaceholder('kubectl logs {pod} -n production', 'pod', 'api-7d9f');
  assert.equal(result, "kubectl logs 'api-7d9f' -n production");
});

test('substitutePlaceholder: leaves other placeholders untouched', () => {
  const result = substitutePlaceholder('psql -U {user} -d {db}', 'user', 'admin');
  assert.equal(result, "psql -U 'admin' -d {db}");
});

test('substitutePlaceholder: handles value with spaces', () => {
  const result = substitutePlaceholder('echo {message}', 'message', 'hello world');
  assert.equal(result, "echo 'hello world'");
});

test('substitutePlaceholder: escapes embedded single quotes to prevent injection', () => {
  const result = substitutePlaceholder('echo {msg}', 'msg', "it's alive");
  assert.equal(result, "echo 'it'\\''s alive'");
});

test('substitutePlaceholder: prevents shell injection via semicolon', () => {
  const result = substitutePlaceholder('ping {host}', 'host', '; rm -rf ~');
  assert.equal(result, "ping '; rm -rf ~'");
});
