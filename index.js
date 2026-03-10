#!/usr/bin/env node

import { cmdSave } from './commands/save.js';
import { cmdFind } from './commands/find.js';
import { cmdRun } from './commands/run.js';
import { cmdList } from './commands/list.js';
import { cmdRemove } from './commands/remove.js';
import { cmdEdit } from './commands/edit.js';
import { cmdTags } from './commands/tags.js';
import { cmdStats } from './commands/stats.js';
import { cmdExport, cmdImport } from './commands/exportImport.js';
import { cmdInteractive } from './commands/interactive.js';
import { cmdHelp } from './commands/help.js';

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
      if (next && !next.startsWith('-')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return { command: command.toLowerCase(), positional, flags };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  if (flags.v || flags.version || command === '--version' || command === '-v') {
    console.log('recall v1.1.0');
    return;
  }

  switch (command) {
    case '':
      process.stdin.isTTY ? await cmdInteractive() : cmdHelp();
      break;
    case 'save': case 's': case 'add':
      await cmdSave({ positional, flags });
      break;
    case 'find': case 'f': case 'search':
      cmdFind({ positional, flags });
      break;
    case 'run': case 'r':
      await cmdRun({ positional, flags });
      break;
    case 'list': case 'ls': case 'l':
      cmdList({ flags });
      break;
    case 'remove': case 'rm': case 'delete':
      cmdRemove({ positional });
      break;
    case 'edit': case 'e':
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
    case 'help': case 'h': case '--help': case '-h':
      cmdHelp();
      break;
    default:
      cmdFind({ positional: [command, ...positional], flags });
  }
}

main().catch(err => {
  console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
  process.exit(1);
});
