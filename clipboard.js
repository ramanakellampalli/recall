/**
 * Cross-platform clipboard support (no dependencies)
 */
import { execSync } from 'child_process';
import { colors as c } from './ui.js';

export function copyToClipboard(text) {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      execSync('pbcopy', { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
    } else if (platform === 'linux') {
      // Try xclip first, then xsel, then wl-copy (Wayland)
      try {
        execSync('xclip -selection clipboard', { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch {
        try {
          execSync('xsel --clipboard --input', { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
        } catch {
          execSync('wl-copy', { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
        }
      }
    } else if (platform === 'win32') {
      execSync('clip', { input: text, stdio: ['pipe', 'pipe', 'pipe'] });
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function tryCopy(text) {
  const ok = copyToClipboard(text);
  if (ok) {
    console.log(`${c.green}✓${c.reset} Copied to clipboard!`);
  } else {
    console.log(`${c.yellow}⚠${c.reset} Could not copy to clipboard. Here's the command:\n`);
    console.log(`  ${c.green}${text}${c.reset}\n`);
  }
  return ok;
}
