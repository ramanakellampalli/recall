import { getAll } from '../store.js';
import { search } from '../search.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdList({ flags }) {
  const snippets = getAll();

  if (snippets.length === 0) {
    console.log(`\n${c.dim}  No snippets saved yet. Use ${c.cyan}recall save${c.dim} to add your first one.${c.reset}\n`);
    return;
  }

  const tag = flags.t || flags.tag;
  const filtered = search(snippets, '', { tag });

  ui.formatResults(filtered, {
    compact: flags.compact || false,
    limit: flags.all ? undefined : 20,
  });
}
