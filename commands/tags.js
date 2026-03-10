import { getAll } from '../store.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdTags() {
  const snippets = getAll();
  const tagMap = {};

  for (const s of snippets) {
    for (const t of (s.tags || [])) {
      tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }

  const sorted = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    console.log(`\n${c.dim}  No tags yet.${c.reset}\n`);
    return;
  }

  ui.heading('🏷  All Tags');
  for (const [tag, count] of sorted) {
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`   ${c.cyan}#${tag.padEnd(20)}${c.reset} ${c.dim}${bar}${c.reset} ${count}`);
  }
  console.log('');
}
