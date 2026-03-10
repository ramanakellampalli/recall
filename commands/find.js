import { getAll, recordUse } from '../store.js';
import { search, parseDSL } from '../search.js';
import { tryCopy } from '../clipboard.js';
import * as ui from '../ui.js';

export function cmdFind({ positional, flags }) {
  const rawQuery = positional.join(' ');
  const { query, filters } = parseDSL(rawQuery);

  const allFilters = {
    tag: flags.t || flags.tag || filters.tag,
    repo: flags.r || flags.repo || filters.repo,
    after: flags.after || flags.since || filters.after,
  };

  const snippets = getAll();
  const results = search(snippets, query, allFilters);

  ui.formatResults(results, {
    compact: flags.compact || false,
    limit: flags.all ? undefined : 10,
  });

  if (results.length > 0) {
    const top = results[0];
    if (flags.copy || flags.cp) tryCopy(top.command);
    recordUse(top.id);
  }
}
