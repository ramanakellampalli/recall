/**
 * Terminal UI formatting and colors (no dependencies)
 */

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

export const colors = c;

export function success(msg) {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

export function error(msg) {
  console.log(`${c.red}✗${c.reset} ${msg}`);
}

export function warn(msg) {
  console.log(`${c.yellow}⚠${c.reset} ${msg}`);
}

export function info(msg) {
  console.log(`${c.blue}ℹ${c.reset} ${msg}`);
}

export function heading(msg) {
  console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`);
}

export function divider() {
  const width = Math.min(process.stdout.columns || 60, 70);
  console.log(c.gray + '─'.repeat(width) + c.reset);
}

export function formatSnippet(snippet, index, options = {}) {
  const { compact = false, showIndex = true } = options;
  const lines = [];

  // Header line
  const idx = showIndex ? `${c.bold}${c.yellow}${index}.${c.reset} ` : '';
  const desc = snippet.description
    ? `${c.bold}${c.white}${snippet.description}${c.reset}`
    : `${c.dim}(no description)${c.reset}`;
  const stars = snippet.useCount > 0 ? ` ${c.yellow}⭐ ${snippet.useCount}${c.reset}` : '';
  lines.push(`${idx}${desc}${stars}`);

  // Command (with syntax highlighting)
  const cmd = snippet.command || '';
  if (cmd.includes('\n')) {
    // Multi-line snippet
    const cmdLines = cmd.split('\n');
    lines.push(`   ${c.green}${cmdLines[0]}${c.reset}`);
    for (let i = 1; i < cmdLines.length; i++) {
      lines.push(`   ${c.green}${cmdLines[i]}${c.reset}`);
    }
  } else {
    lines.push(`   ${c.green}${cmd}${c.reset}`);
  }

  if (!compact) {
    // Tags
    if (snippet.tags?.length) {
      const tags = snippet.tags.map(t => `${c.cyan}#${t}${c.reset}`).join(' ');
      lines.push(`   ${tags}`);
    }

    // Context & time
    const meta = [];
    if (snippet.lastUsedAt) {
      meta.push(`Last used: ${timeAgo(snippet.lastUsedAt)}`);
    }
    if (snippet.context?.gitRepo) {
      let repoStr = snippet.context.gitRepo;
      if (snippet.context.gitBranch) repoStr += ` (${snippet.context.gitBranch})`;
      meta.push(repoStr);
    }
    if (meta.length) {
      lines.push(`   ${c.dim}${meta.join(' │ ')}${c.reset}`);
    }
  }

  return lines.join('\n');
}

export function formatResults(snippets, options = {}) {
  if (snippets.length === 0) {
    console.log(`\n${c.dim}  No snippets found.${c.reset}\n`);
    return;
  }

  const { compact = false, limit } = options;
  const shown = limit ? snippets.slice(0, limit) : snippets;
  const width = Math.min(process.stdout.columns || 60, 70);

  console.log('');
  console.log(`${c.bold} 🔍 ${shown.length}${snippets.length > shown.length ? ` of ${snippets.length}` : ''} result${snippets.length !== 1 ? 's' : ''}${c.reset}`);
  console.log(c.gray + '─'.repeat(width) + c.reset);

  for (let i = 0; i < shown.length; i++) {
    console.log(formatSnippet(shown[i], i + 1, { compact }));
    if (i < shown.length - 1) console.log(c.gray + '─'.repeat(width) + c.reset);
  }

  console.log(c.gray + '─'.repeat(width) + c.reset);

  if (snippets.length > shown.length) {
    console.log(`${c.dim}  ... and ${snippets.length - shown.length} more. Use --all to show all.${c.reset}`);
  }
}

export function formatStats(snippets) {
  const totalSnippets = snippets.length;
  const totalUses = snippets.reduce((sum, s) => sum + (s.useCount || 0), 0);
  const allTags = [...new Set(snippets.flatMap(s => s.tags || []))];
  const repos = [...new Set(snippets.map(s => s.context?.gitRepo).filter(Boolean))];

  heading('📊 Recall Stats');
  console.log(`   Snippets: ${c.bold}${totalSnippets}${c.reset}`);
  console.log(`   Total uses: ${c.bold}${totalUses}${c.reset}`);
  console.log(`   Tags: ${c.bold}${allTags.length}${c.reset} ${c.dim}(${allTags.slice(0, 8).join(', ')}${allTags.length > 8 ? '...' : ''})${c.reset}`);
  console.log(`   Repos: ${c.bold}${repos.length}${c.reset} ${c.dim}(${repos.slice(0, 5).join(', ')}${repos.length > 5 ? '...' : ''})${c.reset}`);

  // Top 5 most used
  if (totalSnippets > 0) {
    const top = [...snippets].sort((a, b) => (b.useCount || 0) - (a.useCount || 0)).slice(0, 5);
    heading('🏆 Most Used');
    top.forEach((s, i) => {
      const desc = s.description || s.command?.slice(0, 40) || '(unnamed)';
      console.log(`   ${i + 1}. ${desc} ${c.yellow}(${s.useCount || 0} uses)${c.reset}`);
    });
  }
  console.log('');
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
