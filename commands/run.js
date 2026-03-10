import { getAll, recordUse } from '../store.js';
import { search, parseDSL } from '../search.js';
import * as ui from '../ui.js';
import readline from 'readline';
import { spawnSync } from 'child_process';

const c = ui.colors;

export async function cmdRun({ positional, flags }) {
  const rawQuery = positional.join(' ');
  const { query, filters } = parseDSL(rawQuery);

  const snippets = getAll();
  const results = search(snippets, query, filters);

  if (results.length === 0) {
    ui.error('No matching snippets found.');
    return;
  }

  const top = results[0];

  console.log('');
  console.log(`  ${c.bold}${c.cyan}Running:${c.reset} ${c.green}${top.command}${c.reset}`);
  if (top.description) console.log(`  ${c.dim}${top.description}${c.reset}`);

  if (flags.confirm || flags.c) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(r => rl.question(`\n  ${c.yellow}Execute? [y/N]:${c.reset} `, r));
    rl.close();
    if (answer.trim().toLowerCase() !== 'y') {
      console.log(`  ${c.dim}Aborted.${c.reset}\n`);
      return;
    }
  }

  console.log('');
  recordUse(top.id);

  const shell = process.env.SHELL || '/bin/sh';
  spawnSync(shell, ['-c', top.command], { stdio: 'inherit' });
}
