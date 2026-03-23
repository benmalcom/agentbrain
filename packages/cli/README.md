# @agentbrain/cli

Command-line interface for AgentBrain - generate smart context documentation for coding agents.

## Installation

```bash
npm install -g @agentbrain/cli
```

## Quick Start

```bash
# ONE-TIME SETUP: Complete automated setup
cd /path/to/your/project
agentbrain setup

# That's it! AgentBrain now:
# ✓ Generates context automatically on commits
# ✓ Injects loading instructions into agent files
# ✓ Keeps everything in sync with your codebase
```

### Manual Setup (Advanced)

```bash
# Configure your API key
agentbrain config

# Generate context docs for your repository
cd /path/to/your/project
agentbrain init

# Generate coding standards
agentbrain standards

# Generate session handoff
agentbrain handoff
```

## Commands

### `agentbrain setup`

**One-command automated setup** for AgentBrain in your repository.

**Usage:**
```bash
agentbrain setup [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--skip-hooks` - Skip git hooks installation
- `--skip-agent-files` - Skip agent file injection

**What it does:**
1. Detects which agents you use (Claude Code, Cursor, Windsurf)
2. Generates initial context documentation
3. Injects context loading instructions into agent files
4. Installs smart git hooks for automatic regeneration
5. Sets up complete automation

**Output:**
- Creates `agentbrain/` directory with context docs
- Updates `CLAUDE.md`, `.cursorrules`, and/or `.windsurfrules`
- Installs `.git/hooks/post-commit` for smart auto-regeneration

**Example:**
```bash
# Complete automated setup
agentbrain setup

# Setup without git hooks
agentbrain setup --skip-hooks
```

**Cost:** ~$0.02-0.05 for initial generation (cached repeats are free)

**Smart Git Hooks:**
After setup, AgentBrain automatically regenerates context when you commit **source file changes**. It intelligently skips regeneration when only documentation or configuration files change, saving time and API costs.

---

### `agentbrain init`

Generate comprehensive context documentation for your repository.

**Usage:**
```bash
agentbrain init [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--max-files <number>` - Maximum files to analyze (default: 100)
- `--no-cache` - Skip cache and regenerate
- `--dry-run` - Preview without generating (free!)

**Output:**
Creates three files in `agentbrain/` directory:
- `context.md` - Full repository intelligence
- `dependency-map.md` - Service relationships and dependencies
- `patterns.md` - Coding patterns and conventions

**Example:**
```bash
# Preview cost first (free)
agentbrain init --dry-run

# Generate for current directory
agentbrain init

# Generate for specific path with custom limit
agentbrain init --path ~/my-project --max-files 50
```

**Cost:** ~$0.02-0.05 for typical repositories (cached repeats are free)

---

### `agentbrain standards`

Generate coding standards files for AI agents.

**Usage:**
```bash
agentbrain standards [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)

**Interactive prompts:**
- Primary language (e.g., TypeScript, Python)
- Framework (e.g., React, Django)
- Testing library (e.g., Jest, pytest)
- Style guide (e.g., Prettier + ESLint)
- Anti-patterns to avoid
- Architecture notes
- Target agents (Claude Code, Cursor, Windsurf)

**Output:**
Creates agent-specific files:
- `CLAUDE.md` - For Claude Code CLI
- `.cursorrules` - For Cursor (also supports legacy `.cursor/rules`)
- `.windsurfrules` - For Windsurf

**Example:**
```bash
agentbrain standards
# Follow the interactive prompts
```

**Cost:** ~$0.01-0.02

---

### `agentbrain handoff`

Generate session handoff document from git changes.

**Usage:**
```bash
agentbrain handoff [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--goal <goal>` - Session goal or objective
- `--commits <number>` - Number of recent commits to include (default: 5)

**Output:**
Creates `agentbrain/handoff.md` with:
- Summary of changes
- Current state
- Context & decisions
- Next steps
- Blockers & questions

**Example:**
```bash
# After making changes
agentbrain handoff --goal "Implement user authentication"

# Include more commit history
agentbrain handoff --goal "Completed auth system" --commits 10
```

**Cost:** ~$0.01

---

### `agentbrain config`

Configure or view API key.

**Usage:**
```bash
agentbrain config [options]
```

**Options:**
- `--show` - Display current configuration

**Example:**
```bash
# Set API key interactively
agentbrain config

# View current config
agentbrain config --show
```

**Supported providers:**
- Anthropic (Claude) - keys starting with `sk-ant-`
- OpenAI (GPT) - keys starting with `sk-`

Configuration stored at `~/.agentbrain/config.json` with secure permissions.

---

## API Key Configuration

AgentBrain supports multiple ways to provide your API key. They are checked in this priority order:

### 1. Environment Variables (Highest Priority)

```bash
# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI
export OPENAI_API_KEY="sk-..."
```

### 2. `.env` Files

Create a `.env` or `.env.local` file in your project:

```bash
# In your project directory
cat > .env <<EOF
OPENAI_API_KEY=sk-...
EOF
```

AgentBrain will automatically load API keys from:
- `.env.local` in current directory
- `.env` in current directory
- `.env.local` in git repository root
- `.env` in git repository root

**Note:** `.env` files are loaded automatically - no need to export or source them!

### 3. Stored Configuration (Lowest Priority)

Use the `agentbrain config` command to store your key persistently:

```bash
agentbrain config
```

This stores the key securely at `~/.agentbrain/config.json` with 0600 permissions.

---

## Summary: API Key Priority

1. ✅ Environment variables (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)
2. ✅ `.env.local` in current directory
3. ✅ `.env` in current directory
4. ✅ `.env.local` in git root
5. ✅ `.env` in git root
6. ✅ `~/.agentbrain/config.json`

## Usage with AI Agents

After running `agentbrain setup`, your agents automatically load context at every session start.

### Claude Code CLI

AgentBrain injects loading instructions into `CLAUDE.md`, which Claude Code CLI reads automatically from your project root. No manual action needed.

### Cursor

AgentBrain injects loading instructions into `.cursorrules` (or `.cursor/rules` for legacy setups), which Cursor reads automatically. No manual action needed.

### Windsurf

AgentBrain injects loading instructions into `.windsurfrules`, which Windsurf reads automatically. No manual action needed.

### Manual Loading (Advanced)

If not using `agentbrain setup`, you can manually reference context files:
```markdown
<!-- In agent prompt or rules file -->
@agentbrain/context.md
@agentbrain/dependency-map.md
@agentbrain/patterns.md
```

## Cost Estimates

All costs are approximate (as of January 2025):

| Operation | Tokens | Anthropic | OpenAI |
|-----------|--------|-----------|--------|
| Init (small) | 10-20K | $0.02-0.05 | $0.02-0.04 |
| Init (medium) | 30-50K | $0.08-0.15 | $0.07-0.12 |
| Standards | 5-8K | $0.01-0.02 | $0.01-0.02 |
| Handoff | 3-5K | $0.01 | $0.01 |
| **Cached repeat** | 0 | **$0.00** | **$0.00** |

**Cache-first:** Repeat runs on same git commit are instant and free!

## Workflow Example

### Recommended: Automated Setup

```bash
# 1. One-time setup (do once per repo)
cd /path/to/project
agentbrain setup

# 2. Start coding - context auto-updates on commits!
# ... make changes ...
git commit -m "Add feature"
# → AgentBrain automatically regenerates context (if source files changed)

# 3. Generate handoff when needed
agentbrain handoff --goal "Completed authentication feature"

# That's it! Everything else is automatic.
```

### Manual Setup (Advanced)

```bash
# 1. Initial setup
cd /path/to/project
agentbrain config

# 2. Generate context (do once per repo)
agentbrain init --dry-run  # Preview first
agentbrain init            # Actually generate

# 3. Generate standards (do once per repo)
agentbrain standards

# 4. During development sessions
# ... make changes ...
agentbrain handoff --goal "Add authentication feature"

# 5. Manually regenerate context after changes
agentbrain init  # Only costs money if git hash changed
```

## Troubleshooting

### "No API key found"

Set your API key:
```bash
agentbrain config
# or
export ANTHROPIC_API_KEY="sk-ant-..."
```

### "Command not found: agentbrain"

Reinstall globally:
```bash
npm install -g @agentbrain/cli
```

### Permission errors

Fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Examples

### Generate docs for multiple projects

```bash
for project in ~/projects/*; do
  echo "Processing $project..."
  agentbrain init --path "$project"
done
```

### CI/CD integration

```bash
# In CI pipeline
export ANTHROPIC_API_KEY="${ANTHROPIC_KEY}"
agentbrain init --path . --no-cache
# Commit generated docs to repo
git add agentbrain/
git commit -m "Update context docs"
```

## Advanced Usage

### Custom file limits

```bash
# For large repos, limit files
agentbrain init --max-files 50

# For small repos, increase limit
agentbrain init --max-files 200
```

### Force regeneration

```bash
# Skip cache even if git hash unchanged
agentbrain init --no-cache
```

## Related Packages

- [@agentbrain/core](../core) - Core library
- [@agentbrain/mcp-server](../mcp-server) - MCP server for agents

## Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/agentbrain/issues)
- Documentation: [Full docs](https://github.com/yourusername/agentbrain)

## License

MIT
