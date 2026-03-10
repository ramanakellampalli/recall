import { getAll, editSnippet } from '../store.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdEdit({ positional, flags }) {
  const target = positional[0];
  if (!target) {
    ui.error('Please provide a snippet ID.');
    console.log(`${c.dim}  Usage: recall edit <id> --desc "new description" --tags "new,tags"${c.reset}`);
    return;
  }

  const updates = {};
  if (flags.d || flags.desc) updates.description = flags.d || flags.desc;
  if (flags.t || flags.tags) {
    updates.tags = (flags.t || flags.tags).split(',').map(t => t.trim()).filter(Boolean);
  }
  if (flags.c || flags.command) updates.command = flags.c || flags.command;

  if (Object.keys(updates).length === 0) {
    ui.error('No updates provided. Use --desc, --tags, or --command flags.');
    return;
  }

  let result = editSnippet(target, updates);
  if (!result) {
    const idx = parseInt(target) - 1;
    const snippets = getAll();
    if (idx >= 0 && idx < snippets.length) {
      result = editSnippet(snippets[idx].id, updates);
    }
  }

  if (result) {
    ui.success(`Updated snippet!`);
    console.log(ui.formatSnippet(result, '•', { showIndex: false }));
  } else {
    ui.error(`Snippet not found: ${target}`);
  }
}
