import { interactiveSearch } from '../interactive.js';
import { recordUse } from '../store.js';
import { tryCopy } from '../clipboard.js';
import * as ui from '../ui.js';

export async function cmdInteractive() {
  const selected = await interactiveSearch();
  if (selected) {
    console.log('');
    console.log(ui.formatSnippet(selected, '•', { showIndex: false }));
    console.log('');
    tryCopy(selected.command);
    recordUse(selected.id);
  }
}
