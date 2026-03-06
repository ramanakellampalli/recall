#!/usr/bin/env node

/**
 * recall — A personal command & snippet memory for developers
 * 
 * Usage:
 *   recall                        Interactive fuzzy search
 *   recall save <cmd> [options]   Save a command/snippet
 *   recall find <query>           Search snippets
 *   recall list                   List all snippets
 *   recall remove <id>            Remove a snippet
 *   recall edit <id>              Edit a snippet
 *   recall export [options]       Export snippets
 *   recall import <file>          Import snippets
 *   recall stats                  Show usage stats
 *   recall tags                   List all tags
 *   recall help                   Show help
 */

import { addSnippet, getAll, removeSnippet, editSnippet, recordUse, getDataFilePath } from './store.js';
import { captureContext } from './context.js';
import { search, parseDSL } from './search.js';
import { interactiveSearch } from './interactive.js';
import { tryCopy } from './clipboard.js';
import { exportSnippets, importSnippets } from './io.js';
import * as ui from './ui.js';
import readline from 'readline';

const c = ui.colors;

// ─── Argument Parsing ────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || '';
  const positional = [];
  const flags = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command: command.toLowerCase(), positional, flags };
}

// ─── Commands ────────────────────────────────────────────────────

async function cmdSave({ positional, flags }) {
  const command = positional.join(' ') || flags.c || flags.command;

  if (!command) {
    // Read from stdin if piped
    if (!process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const stdin = Buffer.concat(chunks).toString('utf-8').trim();
      if (stdin) return doSave(stdin, flags);
    }

    // Interactive mode: prompt for command
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(r => rl.question(q, r));

    console.log(`${c.bold}${c.cyan}Save a new snippet${c.reset}\n`);
    const cmd = await ask(`${c.yellow}Command/snippet:${c.reset} `);
    if (!cmd.trim()) { rl.close(); ui.error('No command provided.'); return; }

    const desc = await ask(`${c.yellow}Description (optional):${c.reset} `);
    const tags = await ask(`${c.yellow}Tags (comma-separated):${c.reset} `);
    rl.close();

    return doSave(cmd.trim(), {
      ...flags,
      d: desc.trim() || flags.d,
      t: tags.trim() || flags.t,
    });
  }

  doSave(command, flags);
}

function doSave(command, flags) {
  const tags = (flags.t || flags.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const description = flags.d || flags.desc || flags.description || '';
  const noContext = flags['no-context'] || false;

  const snippet = {
    command,
    description,
    tags,
    context: noContext ? null : captureContext(),
  };

  const saved = addSnippet(snippet);

  console.log('');
  ui.success(`Saved! ${c.dim}(id: ${saved.id})${c.reset}`);
  console.log(`   ${c.green}${command.split('\n')[0]}${c.reset}${command.includes('\n') ? c.dim + ' (multi-line)' + c.reset : ''}`);
  if (description) console.log(`   ${c.dim}${description}${c.reset}`);
  if (tags.length) console.log(`   ${tags.map(t => `${c.cyan}#${t}${c.reset}`).join(' ')}`);
  if (snippet.context?.gitRepo) {
    let ctxStr = snippet.context.gitRepo;
    if (snippet.context.gitBranch) ctxStr += ` (${snippet.context.gitBranch})`;
    console.log(`   ${c.dim}Context: ${ctxStr}${c.reset}`);
  }
  console.log('');
}

function cmdFind({ positional, flags }) {
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
    if (flags.copy || flags.cp) {
      tryCopy(top.command);
    }
    recordUse(top.id);
  }
}

function cmdList({ flags }) {
  const snippets = getAll();

  if (snippets.length === 0) {
    console.log(`\n${c.dim}  No snippets saved yet. Use ${c.cyan}recall save${c.dim} to add your first one.${c.reset}\n`);
    return;
  }

  const tag = flags.t || flags.tag;
  let filtered = search(snippets, '', { tag });

  ui.formatResults(filtered, {
    compact: flags.compact || false,
    limit: flags.all ? undefined : 20,
  });
}

function cmdRemove({ positional }) {
  const target = positional[0];
  if (!target) {
    ui.error('Please provide a snippet ID or index number.');
    console.log(`${c.dim}  Usage: recall remove <id>${c.reset}`);
    return;
  }

  // Try removing by ID directly
  const ok = removeSnippet(target);
  if (ok) {
    ui.success(`Removed snippet ${c.dim}${target}${c.reset}`);
  } else {
    // Try by index (1-based)
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
}

function cmdEdit({ positional, flags }) {
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

  // Try by ID
  let result = editSnippet(target, updates);
  if (!result) {
    // Try by index
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

function cmdTags() {
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

function cmdStats() {
  const snippets = getAll();
  ui.formatStats(snippets);
}

function cmdExport({ flags }) {
  exportSnippets({
    tag: flags.t || flags.tag,
    file: flags.o || flags.out || flags.file,
    format: flags.format || 'json',
  });
}

function cmdImport({ positional, flags }) {
  const file = positional[0];
  if (!file) {
    ui.error('Please provide a file to import.');
    console.log(`${c.dim}  Usage: recall import team-commands.json${c.reset}`);
    return;
  }
  importSnippets(file, {
    merge: !flags['no-merge'],
    dryRun: flags['dry-run'] || false,
  });
}

async function cmdInteractive() {
  const selected = await interactiveSearch();
  if (selected) {
    console.log('');
    console.log(ui.formatSnippet(selected, '•', { showIndex: false }));
    console.log('');
    tryCopy(selected.command);
    recordUse(selected.id);
  }
}

function cmdHelp() {
  console.log(`
${c.bold}${c.cyan}recall${c.reset} — A personal command & snippet memory for developers

${c.bold}USAGE${c.reset}
  ${c.green}recall${c.reset}                              Interactive fuzzy search
  ${c.green}recall save${c.reset} <cmd> [options]          Save a command or snippet
  ${c.green}recall find${c.reset} <query>                  Search your snippets
  ${c.green}recall list${c.reset}                          List all saved snippets
  ${c.green}recall remove${c.reset} <id|index>             Delete a snippet
  ${c.green}recall edit${c.reset} <id|index> [options]     Edit a snippet
  ${c.green}recall tags${c.reset}                          List all tags
  ${c.green}recall stats${c.reset}                         Usage statistics
  ${c.green}recall export${c.reset} [options]              Export for sharing
  ${c.green}recall import${c.reset} <file>                 Import snippets

${c.bold}SAVE OPTIONS${c.reset}
  ${c.yellow}-t, --tags${c.reset} <tags>       Comma-separated tags
  ${c.yellow}-d, --desc${c.reset} <text>       Description
  ${c.yellow}--no-context${c.reset}            Skip auto-capturing directory/git info

${c.bold}FIND OPTIONS${c.reset}
  ${c.yellow}-t, --tag${c.reset} <tag>         Filter by tag
  ${c.yellow}-r, --repo${c.reset} <repo>       Filter by git repo
  ${c.yellow}--after${c.reset} <time>          Filter by time (e.g. 5m, 1h, 2d)
  ${c.yellow}--copy${c.reset}                  Copy top result to clipboard
  ${c.yellow}--all${c.reset}                   Show all results (no limit)
  ${c.yellow}--compact${c.reset}               Compact output

${c.bold}FILTER DSL${c.reset}  (inline with find query)
  ${c.dim}recall find tag:docker after:1h restart${c.reset}
  ${c.dim}recall find repo:payments error${c.reset}

${c.bold}EXPORT/IMPORT${c.reset}
  ${c.dim}recall export -o team.json${c.reset}
  ${c.dim}recall export -t docker -o docker-cmds.json${c.reset}
  ${c.dim}recall import team.json${c.reset}
  ${c.dim}recall import team.json --dry-run${c.reset}

${c.bold}EXAMPLES${c.reset}
  ${c.dim}recall save "docker system prune -af" -t docker,cleanup -d "Clean all Docker caches"${c.reset}
  ${c.dim}recall find postgres${c.reset}
  ${c.dim}recall find -t aws --copy${c.reset}
  ${c.dim}echo "complex-cmd --with flags" | recall save -t misc${c.reset}

${c.dim}Data stored at: ${getDataFilePath()}${c.reset}
`);
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  // Version flag
  if (flags.v || flags.version) {
    console.log('recall v1.0.0');
    return;
  }

  // Route to command
  switch (command) {
    case '':
      // No args: interactive mode (if TTY) or help
      if (process.stdin.isTTY) {
        await cmdInteractive();
      } else {
        cmdHelp();
      }
      break;
    case 'save':
    case 's':
    case 'add':
      await cmdSave({ positional, flags });
      break;
    case 'find':
    case 'f':
    case 'search':
      cmdFind({ positional, flags });
      break;
    case 'list':
    case 'ls':
    case 'l':
      cmdList({ flags });
      break;
    case 'remove':
    case 'rm':
    case 'delete':
      cmdRemove({ positional });
      break;
    case 'edit':
    case 'e':
      cmdEdit({ positional, flags });
      break;
    case 'tags':
      cmdTags();
      break;
    case 'stats':
      cmdStats();
      break;
    case 'export':
      cmdExport({ flags });
      break;
    case 'import':
      cmdImport({ positional, flags });
      break;
    case 'help':
    case 'h':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    case '--version':
    case '-v':
      console.log('recall v1.0.1');
      break;
    default:
      // Treat unknown command as a find query
      cmdFind({ positional: [command, ...positional], flags });
      break;
  }
}

main().catch(err => {
  ui.error(err.message);
  process.exit(1);
});
