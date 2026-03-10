import fs from 'fs';
import os from 'os';
import path from 'path';

const SKIP = new Set([
  'ls', 'll', 'la', 'l', 'cd', 'pwd', 'clear', 'cls', 'exit', 'history',
  'q', 'quit', 'man', 'which', 'echo', 'cat', 'less', 'more', 'top', 'htop',
]);

/**
 * Detect the most likely shell history file.
 */
export function detectHistoryFile() {
  const candidates = [
    process.env.HISTFILE,
    path.join(os.homedir(), '.zsh_history'),
    path.join(os.homedir(), '.bash_history'),
    path.join(os.homedir(), '.local', 'share', 'fish', 'fish_history'),
  ].filter(Boolean);

  return candidates.find(f => fs.existsSync(f)) || null;
}

/**
 * Parse a history file and return raw command strings.
 * Handles zsh (`: timestamp:0;cmd`), bash (plain lines), and fish formats.
 */
export function parseHistoryFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8', { flag: 'r' });
  const lines = raw.split('\n');
  const commands = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // zsh extended history: `: 1234567890:0;command`
    if (trimmed.startsWith(': ') && trimmed.includes(';')) {
      const cmd = trimmed.slice(trimmed.indexOf(';') + 1).trim();
      if (cmd) commands.push(cmd);
    }
    // fish history: `- cmd: command`
    else if (trimmed.startsWith('- cmd:')) {
      const cmd = trimmed.slice(6).trim();
      if (cmd) commands.push(cmd);
    }
    // bash / plain history
    else if (!trimmed.startsWith('#')) {
      commands.push(trimmed);
    }
  }

  return commands;
}

/**
 * Score and filter commands, returning the most useful ones.
 * Returns [{ command, count }] sorted by frequency descending.
 */
export function rankCommands(commands, limit = 50) {
  const freq = new Map();

  for (const cmd of commands) {
    if (!isUseful(cmd)) continue;
    freq.set(cmd, (freq.get(cmd) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([command, count]) => ({ command, count }));
}

function isUseful(cmd) {
  if (cmd.length < 6) return false;
  const base = cmd.split(/\s+/)[0].replace(/^[^a-zA-Z0-9]*/, '');
  if (SKIP.has(base)) return false;
  return true;
}
