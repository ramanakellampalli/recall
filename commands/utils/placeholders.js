import readline from 'readline';
import * as ui from '../../ui.js';

const c = ui.colors;

/**
 * Extract unique placeholder names from a command string.
 * Placeholders use {name} syntax.
 * e.g. "kubectl logs {pod} -n {namespace}" → ['pod', 'namespace']
 */
export function extractPlaceholders(command) {
  const matches = command.match(/\{([^}]+)\}/g) || [];
  const seen = new Set();
  return matches
    .map(m => m.slice(1, -1).trim())
    .filter(name => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

/**
 * Shell-quote a value so it cannot inject additional shell commands.
 * Wraps in single quotes and escapes any embedded single quotes.
 */
function shellQuote(value) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/**
 * Substitute a single placeholder name with a shell-quoted value throughout the command.
 */
export function substitutePlaceholder(command, name, value) {
  return command.replaceAll(`{${name}}`, shellQuote(value));
}

/**
 * Interactively prompt the user to fill in all placeholders.
 * Returns the fully substituted command string.
 */
export async function fillPlaceholders(command) {
  const names = extractPlaceholders(command);
  if (names.length === 0) return command;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));

  console.log(`\n  ${c.dim}Fill in the placeholders:${c.reset}`);

  let result = command;
  for (const name of names) {
    const value = await ask(`  ${c.yellow}{${name}}${c.reset}: `);
    result = substitutePlaceholder(result, name, value.trim());
  }

  rl.close();
  return result;
}
