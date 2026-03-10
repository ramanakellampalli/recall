import { exportSnippets, importSnippets } from '../io.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdExport({ flags }) {
  exportSnippets({
    tag: flags.t || flags.tag,
    file: flags.o || flags.out || flags.file,
    format: flags.format || 'json',
  });
}

export function cmdImport({ positional, flags }) {
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
