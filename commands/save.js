import { addSnippet } from '../store.js';
import { captureContext } from '../context.js';
import * as ui from '../ui.js';
import readline from 'readline';

const c = ui.colors;

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

export async function cmdSave({ positional, flags }) {
  const command = positional.join(' ') || flags.c || flags.command;

  if (!command) {
    if (!process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const stdin = Buffer.concat(chunks).toString('utf-8').trim();
      if (stdin) return doSave(stdin, flags);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(r => rl.question(q, r));

    console.log(`${c.bold}${c.cyan}Save a new snippet${c.reset}\n`);
    const cmd = await ask(`${c.yellow}Command/snippet:${c.reset} `);
    if (!cmd.trim()) { rl.close(); ui.error('No command provided.'); return; }

    const desc = await ask(`${c.yellow}Description (optional):${c.reset} `);
    const tags = await ask(`${c.yellow}Tags (comma-separated):${c.reset} `);
    rl.close();

    return doSave(cmd.trim(), { ...flags, d: desc.trim() || flags.d, t: tags.trim() || flags.t });
  }

  doSave(command, flags);
}
