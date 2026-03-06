/**
 * Interactive fuzzy search mode — fzf-style terminal UI
 * Pure Node.js, no dependencies
 */
import readline from 'readline';
import { getAll } from './store.js';
import { search } from './search.js';
import { colors as c, formatSnippet } from './ui.js';

export async function interactiveSearch(initialQuery = '') {
  const allSnippets = getAll();

  if (allSnippets.length === 0) {
    console.log(`${c.dim}No snippets saved yet. Use ${c.cyan}recall save${c.dim} to add your first one.${c.reset}`);
    return null;
  }

  return new Promise((resolve) => {
    let query = initialQuery;
    let results = search(allSnippets, query);
    let selectedIdx = 0;
    const maxVisible = Math.min(8, process.stdout.rows ? process.stdout.rows - 6 : 8);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Enable raw mode for keypress detection
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin, rl);
      process.stdin.setRawMode(true);
    }

    function render() {
      // Clear screen
      process.stdout.write('\x1b[2J\x1b[H');

      // Header
      console.log(`${c.bold}${c.cyan}recall${c.reset} ${c.dim}interactive search${c.reset}`);
      console.log(`${c.dim}Type to filter • ↑↓ navigate • Enter select • Esc quit${c.reset}`);
      console.log('');

      // Search input
      process.stdout.write(`${c.yellow}❯${c.reset} ${query}${c.dim}│${c.reset}`);
      console.log('');
      console.log('');

      // Results
      const visible = results.slice(0, maxVisible);
      if (visible.length === 0) {
        console.log(`${c.dim}  No matches${c.reset}`);
      } else {
        for (let i = 0; i < visible.length; i++) {
          const isSelected = i === selectedIdx;
          const prefix = isSelected ? `${c.cyan}▸ ` : '  ';
          const desc = visible[i].description || visible[i].command?.slice(0, 50) || '(unnamed)';
          const cmd = visible[i].command?.split('\n')[0]?.slice(0, 60) || '';
          const tags = (visible[i].tags || []).map(t => `#${t}`).join(' ');

          if (isSelected) {
            console.log(`${prefix}${c.bold}${c.white}${desc}${c.reset}`);
            console.log(`  ${c.green}${cmd}${c.reset}`);
            if (tags) console.log(`  ${c.cyan}${tags}${c.reset}`);
          } else {
            console.log(`${prefix}${c.dim}${desc}${c.reset}`);
            console.log(`  ${c.dim}${cmd}${c.reset}`);
          }
          if (i < visible.length - 1) console.log('');
        }
      }

      // Footer
      console.log('');
      console.log(`${c.dim}${results.length} snippet${results.length !== 1 ? 's' : ''} matched${c.reset}`);
    }

    function cleanup() {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
    }

    function onKeypress(str, key) {
      if (!key) return;

      if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        process.stdout.write('\x1b[2J\x1b[H');
        resolve(null);
        return;
      }

      if (key.name === 'return') {
        const selected = results[selectedIdx];
        cleanup();
        process.stdout.write('\x1b[2J\x1b[H');
        resolve(selected || null);
        return;
      }

      if (key.name === 'up') {
        selectedIdx = Math.max(0, selectedIdx - 1);
      } else if (key.name === 'down') {
        selectedIdx = Math.min(results.length - 1, selectedIdx + 1);
      } else if (key.name === 'backspace') {
        query = query.slice(0, -1);
        results = search(allSnippets, query);
        selectedIdx = 0;
      } else if (str && !key.ctrl && !key.meta) {
        query += str;
        results = search(allSnippets, query);
        selectedIdx = 0;
      }

      render();
    }

    process.stdin.on('keypress', onKeypress);
    render();
  });
}
