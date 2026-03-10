import { getAll, removeSnippet } from '../store.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdRemove({ positional }) {
  const target = positional[0];
  if (!target) {
    ui.error('Please provide a snippet ID or index number.');
    console.log(`${c.dim}  Usage: recall remove <id>${c.reset}`);
    return;
  }

  const ok = removeSnippet(target);
  if (ok) {
    ui.success(`Removed snippet ${c.dim}${target}${c.reset}`);
    return;
  }

  const idx = parseInt(target) - 1;
  const snippets = getAll();
  if (idx >= 0 && idx < snippets.length) {
    const snippet = snippets[idx];
    removeSnippet(snippet.id);
    ui.success(`Removed: ${c.dim}${snippet.description || snippet.command?.slice(0, 40)}${c.reset}`);
  } else {
    ui.error(`Snippet not found: ${target}`);
  }
}
