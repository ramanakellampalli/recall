import { getAll } from '../store.js';
import * as ui from '../ui.js';

export function cmdStats() {
  const snippets = getAll();
  ui.formatStats(snippets);
}
