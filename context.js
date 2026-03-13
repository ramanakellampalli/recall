import { execSync } from 'child_process';
import path from 'path';

export function captureContext() {
  const context = {
    directory: process.cwd(),
    timestamp: new Date().toISOString(),
  };

  // Try to get git info
  try {
    const repo = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    context.gitRepo = path.basename(repo);
    context.gitRepoPath = repo;
  } catch { /* not a git repo */ }

  try {
    context.gitBranch = execSync('git branch --show-current', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { /* ignore */ }

  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    // Strip embedded credentials (e.g. https://token:x-oauth-basic@github.com/...)
    context.gitRemote = remote.replace(/^(https?:\/\/)[^@]+@/, '$1');
  } catch { /* ignore */ }

  return context;
}

function shortenPath(p) {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (home && p.startsWith(home)) {
    return '~' + p.slice(home.length);
  }
  return p;
}
