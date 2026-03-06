/**
 * Fuzzy search + frecency ranking engine
 */

export function search(snippets, query, options = {}) {
  const { tag, repo, after } = options;

  let results = snippets;

  // Filter by tag
  if (tag) {
    const tagLower = tag.toLowerCase();
    results = results.filter(s =>
      (s.tags || []).some(t => t.toLowerCase() === tagLower)
    );
  }

  // Filter by repo
  if (repo) {
    const repoLower = repo.toLowerCase();
    results = results.filter(s =>
      s.context?.gitRepo?.toLowerCase().includes(repoLower)
    );
  }

  // Filter by time (e.g. "5m", "1h", "2d")
  if (after) {
    const ms = parseTimeString(after);
    if (ms) {
      const cutoff = Date.now() - ms;
      results = results.filter(s =>
        new Date(s.createdAt).getTime() > cutoff
      );
    }
  }

  const now = Date.now();

  // Score each snippet combining fuzzy relevance and frecency
  results = results
    .map(s => {
      const fuzz = query ? fuzzyScore(s, query) : 1;
      const frecency = frecencyScore(s, now);
      return { snippet: s, score: fuzz * frecency };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.snippet);

  return results;
}

function fuzzyScore(snippet, query) {
  const queryLower = query.toLowerCase();
  const terms = queryLower.split(/\s+/);

  let totalScore = 0;

  // Fields to search with their weights
  const fields = [
    { value: snippet.command || '', weight: 3 },
    { value: snippet.description || '', weight: 2 },
    { value: (snippet.tags || []).join(' '), weight: 2.5 },
    { value: snippet.context?.gitRepo || '', weight: 1 },
    { value: snippet.context?.directory || '', weight: 0.5 },
  ];

  for (const term of terms) {
    let termScore = 0;

    for (const field of fields) {
      const fieldLower = field.value.toLowerCase();

      // Exact substring match
      if (fieldLower.includes(term)) {
        termScore += field.weight * 10;

        // Bonus for word-boundary match
        const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(term)}`, 'i');
        if (wordBoundaryRegex.test(field.value)) {
          termScore += field.weight * 5;
        }

        // Bonus for exact full match
        if (fieldLower === term) {
          termScore += field.weight * 20;
        }
      }
      // Fuzzy character match
      else if (fuzzyMatch(fieldLower, term)) {
        termScore += field.weight * 3;
      }
    }

    if (termScore === 0) return 0; // All terms must match something
    totalScore += termScore;
  }

  return totalScore;
}

function fuzzyMatch(text, pattern) {
  let pi = 0;
  for (let ti = 0; ti < text.length && pi < pattern.length; ti++) {
    if (text[ti] === pattern[pi]) pi++;
  }
  return pi === pattern.length;
}

function frecencyScore(snippet, now) {
  const useCount = snippet.useCount || 0;
  const lastUsed = snippet.lastUsedAt ? new Date(snippet.lastUsedAt).getTime() : 0;
  const age = now - lastUsed;

  // Decay factor: recent usage matters more
  const hoursSinceUse = age / (1000 * 60 * 60);
  let recencyMultiplier;
  if (hoursSinceUse < 1) recencyMultiplier = 4;
  else if (hoursSinceUse < 24) recencyMultiplier = 2;
  else if (hoursSinceUse < 168) recencyMultiplier = 1.5; // 1 week
  else if (hoursSinceUse < 720) recencyMultiplier = 1;   // 1 month
  else recencyMultiplier = 0.5;

  return (useCount + 1) * recencyMultiplier;
}

function parseTimeString(str) {
  const match = str.match(/^(\d+)\s*(m|min|h|hr|d|day|w|week)s?$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    m: 60000, min: 60000,
    h: 3600000, hr: 3600000,
    d: 86400000, day: 86400000,
    w: 604800000, week: 604800000,
  };
  return num * (multipliers[unit] || 0);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a filter DSL query like "level:error service:auth after:5m docker restart"
 */
export function parseDSL(input) {
  const filters = {};
  const queryParts = [];

  const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const val = token.slice(colonIdx + 1).replace(/^"|"$/g, '');
      if (['tag', 't'].includes(key)) filters.tag = val;
      else if (['repo', 'r'].includes(key)) filters.repo = val;
      else if (['after', 'since'].includes(key)) filters.after = val;
      else queryParts.push(token); // Unknown filter, treat as search term
    } else {
      queryParts.push(token);
    }
  }

  return {
    query: queryParts.join(' '),
    filters,
  };
}
