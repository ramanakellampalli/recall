# recall

[![npm version](https://img.shields.io/npm/v/recall-dev)](https://www.npmjs.com/package/recall-dev)
[![npm downloads](https://img.shields.io/npm/dm/recall-dev)](https://www.npmjs.com/package/recall-dev)

**A personal command & snippet memory for developers.**

Stop Googling the same commands. Stop scrolling through shell history. Save once, find instantly.

## Install

```bash
npm install -g recall-dev
```

## Quick Start

```bash
# Save a command with tags and description
recall save "docker system prune -af --volumes" -t docker,cleanup -d "Nuclear clean Docker"

# Find it later
recall find docker cleanup

# Interactive fuzzy search (just run recall with no args)
recall

# Copy the top result straight to clipboard
recall find postgres --copy
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `recall` | | Interactive fuzzy search |
| `recall save <cmd>` | `s`, `add` | Save a command or snippet |
| `recall find <query>` | `f`, `search` | Search your snippets |
| `recall list` | `ls`, `l` | List all saved snippets |
| `recall remove <id>` | `rm`, `delete` | Delete a snippet |
| `recall edit <id>` | `e` | Edit a snippet |
| `recall tags` | | List all tags |
| `recall stats` | | Usage statistics |
| `recall export` | | Export for team sharing |
| `recall import <file>` | | Import shared snippets |

## Features

### Save with Context

When you save a snippet, `recall` automatically captures:
- Your current directory
- Git repo name and branch
- Timestamp

```bash
recall save "pg_dump -U admin proddb > backup.sql" -t postgres,backup -d "Dump production database"

# ✓ Saved!
#    pg_dump -U admin proddb > backup.sql
#    #postgres #backup
#    Context: payments-api (main)
```

### Multi-line Snippets

Pipe complex commands or code blocks:

```bash
echo 'kubectl get pods -n production \
  --field-selector=status.phase!=Running \
  -o custom-columns=NAME:.metadata.name' | recall save -t k8s,debug -d "Find unhealthy pods"
```

### Smart Search with Filter DSL

Combine free text with structured filters:

```bash
recall find docker restart           # fuzzy search
recall find tag:aws deploy           # filter by tag
recall find repo:payments error      # filter by git repo
recall find after:1h                 # recently added
recall find tag:docker after:2d      # combine filters
```

### Frecency Ranking

Search results are ranked by a blended score combining **fuzzy relevance**, **frequency** (how often you use them), and **recency** (how recently you used them). Your most relevant commands always float to the top. Usage is tracked automatically on every `find` — no extra flags needed.

### Interactive Mode

Run `recall` with no arguments for an fzf-style interactive search:

- Type to filter
- Arrow keys to navigate
- Enter to select & copy
- Esc to cancel

### Team Sharing

Export your tribal knowledge for the team:

```bash
# Export everything
recall export -o team-commands.json

# Export only Docker-related commands
recall export -t docker -o docker-playbook.json

# Import on another machine
recall import team-commands.json

# Preview what would be imported
recall import team-commands.json --dry-run
```

### Clipboard Integration

```bash
recall find ssl --copy     # Copies top result to clipboard
```

Works on macOS (pbcopy), Linux (xclip/xsel/wl-copy), and Windows (clip).

## Data Storage

All data is stored locally in `~/.recall/snippets.json`. It's a plain JSON file you can back up, version control, or edit directly.

> This path is intentionally excluded from the project `.gitignore` — your personal snippets won't be committed accidentally.

## Examples

```bash
# Save common commands
recall save "lsof -ti :3000 | xargs kill" -t port,kill -d "Kill process on port 3000"
recall save "ssh -L 5432:rds-host:5432 bastion" -t ssh,tunnel,db -d "Tunnel to production DB"
recall save "git log --oneline --graph --all" -t git,log -d "Pretty git log"

# Complex multi-line saves
recall save 'curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '\''{"email":"test@test.com","password":"secret"}'\''' \
  -t curl,auth,api -d "Test auth endpoint"

# Quick searches
recall find kill port
recall find tunnel
recall find git log

# Browse by tag
recall list -t docker
recall list -t aws

# See your stats
recall stats
```

## License

MIT
