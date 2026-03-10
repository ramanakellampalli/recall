import { getDataFilePath } from '../store.js';
import * as ui from '../ui.js';

const c = ui.colors;

export function cmdHelp() {
  console.log(`
${c.bold}${c.cyan}recall${c.reset} — A personal command & snippet memory for developers

${c.bold}USAGE${c.reset}
  ${c.green}recall${c.reset}                              Interactive fuzzy search
  ${c.green}recall save${c.reset} <cmd> [options]          Save a command or snippet
  ${c.green}recall find${c.reset} <query>                  Search your snippets
  ${c.green}recall run${c.reset} <query>                   Find and execute top result
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

${c.bold}RUN OPTIONS${c.reset}
  ${c.yellow}--confirm${c.reset}               Prompt before executing

${c.bold}FILTER DSL${c.reset}  (inline with find/run query)
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
  ${c.dim}recall run docker cleanup --confirm${c.reset}
  ${c.dim}recall find -t aws --copy${c.reset}
  ${c.dim}echo "complex-cmd --with flags" | recall save -t misc${c.reset}

${c.dim}Data stored at: ${getDataFilePath()}${c.reset}
`);
}
