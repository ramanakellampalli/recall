/**
 * Import/export snippets for team sharing
 */
import fs from 'fs';
import { load, save, getAll } from './store.js';
import * as ui from './ui.js';
const c = ui.colors;

export function exportSnippets(options = {}) {
  const { tag, file, format = 'json' } = options;

  let snippets = getAll();

  // Filter by tag if specified
  if (tag) {
    const tagLower = tag.toLowerCase();
    snippets = snippets.filter(s =>
      (s.tags || []).some(t => t.toLowerCase() === tagLower)
    );
  }

  if (snippets.length === 0) {
    ui.warn('No snippets to export.');
    return;
  }

  // Clean sensitive context before export
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: snippets.length,
    snippets: snippets.map(s => ({
      command: s.command,
      description: s.description,
      tags: s.tags,
      context: s.context ? { gitRepo: s.context.gitRepo } : undefined,
      createdAt: s.createdAt,
    })),
  };

  const output = JSON.stringify(exportData, null, 2);

  if (file) {
    fs.writeFileSync(file, output, 'utf-8');
    ui.success(`Exported ${snippets.length} snippet(s) to ${c.cyan}${file}${c.reset}`);
  } else {
    // Write to stdout for piping
    process.stdout.write(output + '\n');
  }
}

export function importSnippets(file, options = {}) {
  const { merge = true, dryRun = false } = options;

  if (!fs.existsSync(file)) {
    ui.error(`File not found: ${file}`);
    return;
  }

  let importData;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    importData = JSON.parse(raw);
  } catch (e) {
    ui.error(`Invalid JSON file: ${e.message}`);
    return;
  }

  const incoming = importData.snippets || [];
  if (incoming.length === 0) {
    ui.warn('No snippets found in import file.');
    return;
  }

  const data = load();
  const existing = data.snippets || [];

  let added = 0;
  let skipped = 0;

  for (const snippet of incoming) {
    // Deduplicate by command content
    const isDuplicate = existing.some(e => e.command === snippet.command);

    if (isDuplicate && merge) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      const newSnippet = {
        command: snippet.command,
        description: snippet.description,
        tags: snippet.tags,
        context: snippet.context,
        createdAt: snippet.createdAt || new Date().toISOString(),
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        lastUsedAt: new Date().toISOString(),
        useCount: 0,
        imported: true,
        importedFrom: file,
      };
      existing.push(newSnippet);
    }
    added++;
  }

  if (!dryRun) {
    data.snippets = existing;
    save(data);
  }

  const prefix = dryRun ? `${c.yellow}[dry-run]${c.reset} ` : '';
  ui.success(`${prefix}Imported ${c.bold}${added}${c.reset} snippet(s), skipped ${skipped} duplicate(s)`);
}
