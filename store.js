import fs from 'fs';
import path from 'path';
import os from 'os';

const RECALL_DIR = process.env.RECALL_DATA_DIR || path.join(os.homedir(), '.recall');
const DATA_FILE = path.join(RECALL_DIR, 'snippets.json');

function ensureDir() {
  if (!fs.existsSync(RECALL_DIR)) {
    fs.mkdirSync(RECALL_DIR, { recursive: true });
  }
}

export function load() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    return { snippets: [], version: 1 };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { snippets: [], version: 1 };
  }
}

export function save(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function addSnippet(snippet) {
  const data = load();
  snippet.id = generateId();
  snippet.createdAt = new Date().toISOString();
  snippet.lastUsedAt = snippet.createdAt;
  snippet.useCount = 0;
  data.snippets.push(snippet);
  save(data);
  return snippet;
}

export function recordUse(id) {
  const data = load();
  const snippet = data.snippets.find(s => s.id === id);
  if (snippet) {
    snippet.useCount = (snippet.useCount || 0) + 1;
    snippet.lastUsedAt = new Date().toISOString();
    save(data);
  }
}

export function removeSnippet(id) {
  const data = load();
  const idx = data.snippets.findIndex(s => s.id === id);
  if (idx === -1) return false;
  data.snippets.splice(idx, 1);
  save(data);
  return true;
}

export function editSnippet(id, updates) {
  const data = load();
  const snippet = data.snippets.find(s => s.id === id);
  if (!snippet) return null;
  Object.assign(snippet, updates);
  save(data);
  return snippet;
}

export function getAll() {
  return load().snippets || [];
}

export function getDataFilePath() {
  return DATA_FILE;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
