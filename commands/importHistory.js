import readline from 'readline';
import { detectHistoryFile, parseHistoryFile, rankCommands } from './utils/history.js';
import { addSnippet, getAll } from '../store.js';
import * as ui from '../ui.js';

const c = ui.colors;

export async function cmdImportHistory({ flags }) {
  const historyFile = flags.file || flags.f || detectHistoryFile();

  if (!historyFile) {
    ui.error('No shell history file found. Use --file <path> to specify one.');
    return;
  }

  const limit = parseInt(flags.top || flags.n || '50');
  const raw = parseHistoryFile(historyFile);
  const ranked = rankCommands(raw, limit);

  if (ranked.length === 0) {
    ui.error('No usable commands found in history.');
    return;
  }

  // Deduplicate against already-saved snippets
  const existing = new Set(getAll().map(s => s.command));
  const candidates = ranked.filter(r => !existing.has(r.command));

  if (candidates.length === 0) {
    console.log(`\n${c.dim}  All top history commands are already saved.${c.reset}\n`);
    return;
  }

  console.log(`\n${c.bold}${c.cyan}Shell History Import${c.reset}`);
  console.log(`${c.dim}Source: ${historyFile}${c.reset}`);
  console.log(`${c.dim}Space to select • A to select all • Enter to save • Esc to cancel${c.reset}\n`);

  const selected = await multiSelect(candidates);

  if (selected.length === 0) {
    console.log(`\n${c.dim}  Nothing selected.${c.reset}\n`);
    return;
  }

  for (const { command } of selected) {
    addSnippet({ command, description: '', tags: ['history'], context: null });
  }

  console.log('');
  ui.success(`Saved ${selected.length} command${selected.length !== 1 ? 's' : ''} from history.`);
  console.log(`${c.dim}  Tagged with #history — edit descriptions with: recall edit <id>${c.reset}\n`);
}

async function multiSelect(candidates) {
  return new Promise((resolve) => {
    const selected = new Set();
    let cursor = 0;
    const maxVisible = Math.min(15, process.stdout.rows ? process.stdout.rows - 8 : 15);
    let scrollOffset = 0;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin, rl);
      process.stdin.setRawMode(true);
    }

    function render() {
      process.stdout.write('\x1b[2J\x1b[H');

      const visible = candidates.slice(scrollOffset, scrollOffset + maxVisible);

      for (let i = 0; i < visible.length; i++) {
        const idx = scrollOffset + i;
        const { command, count } = visible[i];
        const isCursor = idx === cursor;
        const isSelected = selected.has(idx);
        const checkbox = isSelected ? `${c.green}[✔]${c.reset}` : `${c.dim}[ ]${c.reset}`;
        const pointer = isCursor ? `${c.cyan}▸${c.reset}` : ' ';
        const freq = count > 1 ? `${c.dim} ×${count}${c.reset}` : '';
        const cmd = command.length > 70 ? command.slice(0, 67) + '...' : command;
        const line = isCursor ? `${c.bold}${cmd}${c.reset}` : `${c.dim}${cmd}${c.reset}`;
        console.log(`${pointer} ${checkbox} ${line}${freq}`);
      }

      console.log('');
      console.log(`${c.dim}${selected.size} selected of ${candidates.length} • Space select • A all • Enter save • Esc cancel${c.reset}`);
    }

    function cleanup() {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      rl.close();
      process.stdout.write('\x1b[2J\x1b[H');
    }

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        resolve([]);
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve(candidates.filter((_, i) => selected.has(i)));
        return;
      }

      if (key.name === 'up') {
        cursor = Math.max(0, cursor - 1);
        if (cursor < scrollOffset) scrollOffset = cursor;
      } else if (key.name === 'down') {
        cursor = Math.min(candidates.length - 1, cursor + 1);
        if (cursor >= scrollOffset + maxVisible) scrollOffset = cursor - maxVisible + 1;
      } else if (str === ' ') {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (str === 'a' || str === 'A') {
        if (selected.size === candidates.length) {
          selected.clear();
        } else {
          candidates.forEach((_, i) => selected.add(i));
        }
      }

      render();
    }

    process.stdin.on('keypress', onKeypress);
    render();
  });
}
