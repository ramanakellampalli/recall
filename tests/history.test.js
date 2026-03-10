import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryFile, rankCommands } from '../commands/utils/history.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ─── parseHistoryFile ────────────────────────────────────────────

function writeTmp(content) {
  const f = path.join(os.tmpdir(), `recall-hist-${Date.now()}.txt`);
  fs.writeFileSync(f, content, 'utf-8');
  return f;
}

test('parseHistoryFile: parses plain bash history', () => {
  const f = writeTmp('docker ps\ngit status\nkubectl get pods\n');
  const cmds = parseHistoryFile(f);
  assert.deepEqual(cmds, ['docker ps', 'git status', 'kubectl get pods']);
  fs.unlinkSync(f);
});

test('parseHistoryFile: parses zsh extended history format', () => {
  const f = writeTmp(': 1700000000:0;docker system prune -af\n: 1700000001:0;git log --oneline\n');
  const cmds = parseHistoryFile(f);
  assert.deepEqual(cmds, ['docker system prune -af', 'git log --oneline']);
  fs.unlinkSync(f);
});

test('parseHistoryFile: parses fish history format', () => {
  const f = writeTmp('- cmd: kubectl get nodes\n  when: 1700000000\n- cmd: npm install\n  when: 1700000001\n');
  const cmds = parseHistoryFile(f);
  assert.ok(cmds.includes('kubectl get nodes'));
  assert.ok(cmds.includes('npm install'));
  fs.unlinkSync(f);
});

test('parseHistoryFile: skips blank lines and comments', () => {
  const f = writeTmp('\n# timestamp\ndocker ps\n\n');
  const cmds = parseHistoryFile(f);
  assert.deepEqual(cmds, ['docker ps']);
  fs.unlinkSync(f);
});

// ─── rankCommands ────────────────────────────────────────────────

test('rankCommands: ranks by frequency descending', () => {
  const cmds = ['docker ps', 'docker ps', 'docker ps', 'git status', 'git status'];
  const ranked = rankCommands(cmds);
  assert.equal(ranked[0].command, 'docker ps');
  assert.equal(ranked[0].count, 3);
  assert.equal(ranked[1].command, 'git status');
  assert.equal(ranked[1].count, 2);
});

test('rankCommands: filters out trivial commands', () => {
  const cmds = ['ls', 'cd', 'pwd', 'clear', 'docker ps'];
  const ranked = rankCommands(cmds);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].command, 'docker ps');
});

test('rankCommands: filters out very short commands', () => {
  const cmds = ['x', 'ab', 'docker ps'];
  const ranked = rankCommands(cmds);
  assert.equal(ranked.length, 1);
});

test('rankCommands: respects limit', () => {
  const cmds = Array.from({ length: 100 }, (_, i) => `command-${i} --flag`);
  const ranked = rankCommands(cmds, 10);
  assert.equal(ranked.length, 10);
});

test('rankCommands: deduplicates identical commands', () => {
  const cmds = ['git log --oneline', 'git log --oneline', 'git log --oneline'];
  const ranked = rankCommands(cmds);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].count, 3);
});
