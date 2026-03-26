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

# Generate task specification (optional)
agentbrain spec "add user authentication"

# Generate coding standards
agentbrain standards

# Generate session handoff
agentbrain handoff

# Detect doom loops in git history
agentbrain doom

# Run health diagnostics
agentbrain doctor

# View auto-update status
agentbrain status
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
- Creates `.agentbrain/` directory with context docs
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
After setup, AgentBrain automatically regenerates context in the background when you commit **source file changes**. Git commits complete instantly while context updates in the background. It intelligently skips regeneration when only documentation or configuration files change, saving time and API costs.

You can check the update status in `.agentbrain/update.log`.

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
Creates three files in `.agentbrain/` directory:
- `context.md` - Navigation guide with exact file paths and function names
- `dependency-map.md` - Actual code dependencies showing imports and data flow
- `patterns.md` - Coding patterns and conventions found in the codebase

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

### `agentbrain spec`

Generate a structured specification for a task or feature using AI-guided prompts.

**Usage:**
```bash
agentbrain spec [task-description] [options]
```

**Arguments:**
- `task-description` - Brief task description (e.g., "add user authentication")

**Options:**
- `--path <path>` - Repository path (default: current directory)

**Interactive prompts:**
The command guides you through 5 questions to create a comprehensive spec:
1. **Problem** - What problem does this solve? (1-2 sentences)
2. **Approach** - What's your approach or implementation idea? (or "not sure yet")
3. **Out of Scope** - What should the agent NOT touch or change?
4. **Done Criteria** - What does "done" look like? (acceptance criteria)
5. **Risks** - Any edge cases or risks to consider?

**Output:**
Creates `.agentbrain/specs/{task-slug}.md` with:
- Problem statement
- Scope boundaries
- Acceptance criteria checklist
- Risks & edge cases
- Implementation notes (AI-generated using repository context)
- Task checklist (ordered by dependency)

**Automatic Injection:**
Injects spec reference into your agent files (CLAUDE.md, .cursorrules, .windsurfrules) so the agent reads the spec before implementing.

**Example:**
```bash
# Generate spec with interactive prompts
agentbrain spec "add OAuth authentication"

# The command will:
# 1. Ask 5 questions to gather requirements
# 2. Use repository context to generate implementation notes
# 3. Create .agentbrain/specs/add-oauth-authentication.md
# 4. Inject "Active Spec" reference into agent files
# 5. Agent automatically reads spec at session start
```

**Example Spec Output:**
```markdown
# Spec: add OAuth authentication

*Created: 2025-01-15 | Repo: my-project*

## Problem
Users need to authenticate using OAuth providers instead of just email/password.

## Scope
**Out of scope:** Social login with Facebook/Twitter

## Acceptance Criteria
- [ ] OAuth flow works with Google
- [ ] Tokens are stored securely
- [ ] Existing users can link OAuth accounts

## Risks & Edge Cases
- Token expiry handling
- Race conditions during OAuth callback

## Implementation Notes
- Use existing auth middleware pattern from src/auth/
- Store OAuth tokens in encrypted user_credentials table
- Add OAuth callback route to existing auth router
- Follow repository's error handling pattern

## Task Checklist
- [ ] Add OAuth provider configuration
- [ ] Implement OAuth callback handler
- [ ] Create token storage schema
- [ ] Add OAuth middleware
- [ ] Update auth routes
- [ ] Write integration tests
```

**MCP Integration:**
After creating a spec, agents can load it via the MCP `load_spec` tool:
```typescript
// Agent automatically loads via injected reference
// Or manually via MCP:
load_spec({ repoPath: "/path/to/repo", task: "add-oauth-authentication" })
```

**Cost:** ~$0.01-0.02 (uses fast model with context-aware generation)

**Workflow:**
```bash
# 1. Plan feature with spec
agentbrain spec "add OAuth authentication"

# 2. Agent reads spec automatically at session start
# (Injected into CLAUDE.md, .cursorrules, .windsurfrules)

# 3. Implement feature following the spec
# ... coding session ...

# 4. Remove spec reference when done
# (Manually edit agent files or use agentbrain disable)
```

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
Creates `.agentbrain/handoff.md` with:
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

### `agentbrain doom`

Detect "doom loops" - when your agent is stuck modifying the same files repeatedly.

**Usage:**
```bash
agentbrain doom [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--commits <number>` - Number of commits to analyze (default: 10)
- `--threshold <number>` - Threshold for doom loop detection (default: 4)

**What it detects:**
- Files modified repeatedly in recent commits
- Indicators that the agent is stuck in a loop
- Patterns suggesting the same problem is being fixed multiple times

**Output:**
- List of files modified more than threshold times
- Percentage breakdown of commit focus
- Suggestions for breaking out of the loop

**Example:**
```bash
# Check last 10 commits for doom loops
agentbrain doom

# Analyze last 20 commits with higher threshold
agentbrain doom --commits 20 --threshold 5
```

**Example output:**
```
⚠ Possible doom loop detected

These files were modified 4+ times in the last 10 commits:

  billing.service.ts (6 times - 60%)
  auth.service.ts    (4 times - 40%)

Suggestions:
  → Stop coding. Investigate root cause first.
  → Run: agentbrain spec "fix [problem description]"
  → Consider: revert to last working state and start fresh
```

**Cost:** Free - pure git analysis, no API calls

---

### `agentbrain doctor`

Run comprehensive diagnostic checks on your AgentBrain setup.

**Usage:**
```bash
agentbrain doctor [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--fix` - Attempt to auto-fix warnings (experimental)
- `--json` - Output JSON for programmatic use

**What it checks:**
- ✓ API key configuration (Anthropic or OpenAI)
- ✓ Git hooks installed correctly
- ✓ Cache validity (matches current git HEAD)
- ✓ Context freshness (last generation time)
- ✓ Agent files exist (CLAUDE.md, .cursorrules, .windsurfrules)
- ✓ Hook execution log (recent updates)
- ✓ `.agentbrain/` directory structure
- ✓ Git repository status
- ✓ File permissions
- ✓ Node.js version compatibility
- ✓ Available disk space

**Output:**
- Detailed check results with pass/warn/fail status
- Score summary (e.g., "11/11 checks passed")
- Actionable fix suggestions for any warnings
- Execution time for diagnostics

**Example:**
```bash
# Run diagnostics
agentbrain doctor

# Try to auto-fix issues
agentbrain doctor --fix

# Get JSON output for scripts
agentbrain doctor --json
```

**Example output:**
```
AgentBrain Doctor — /Users/you/project

Checking setup...

  ✓ api_key               anthropic detected
  ✓ git_hook              installed · post-commit
  ✓ cache_valid           matches HEAD: d9b2643
  ✓ context_freshness     0 hours ago
  ✓ agent_files           CLAUDE.md · .cursorrules
  ✓ hook_log              2 updates · last: success
  ✓ directory_structure   all directories exist
  ✓ git_repo              valid repository
  ✓ file_permissions      all correct
  ✓ node_version          v20.10.0 (compatible)
  ✓ disk_space            42.3 GB available

Score: 11/11 checks passed
```

**Cost:** Free - local checks only, no API calls

---

### `agentbrain status`

Show git hook auto-update history and configuration.

**Usage:**
```bash
agentbrain status [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--lines <number>` - Number of recent log entries to show (default: 10)

**What it shows:**
- Configured AI agents (Claude Code, Cursor, Windsurf)
- Setup timestamp
- Recent git hook execution log
- Success/failure status of automatic updates
- Processing time for each update

**Output:**
- Agent configuration summary
- Last N entries from `.agentbrain/update.log`
- Formatted with timestamps and status indicators

**Example:**
```bash
# Show last 10 updates
agentbrain status

# Show last 20 updates
agentbrain status --lines 20
```

**Example output:**
```
Repository: /Users/you/project

Configured agents:
  claude-code, cursor
  Setup: 1/15/2025, 10:30:00 AM

Recent hook updates (.agentbrain/update.log):

2025-01-15 14:23:45 | Git: d9b2643 | SUCCESS | 25s
2025-01-15 12:10:12 | Git: a3f8921 | SUCCESS | 22s
2025-01-15 10:45:33 | Git: f2e7890 | SKIP    | Documentation changes only
2025-01-14 16:20:05 | Git: 8c1b456 | SUCCESS | 28s
```

**Cost:** Free - reads local log file, no API calls

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

### `agentbrain disable`

Disable or uninstall AgentBrain from your repository.

**Usage:**
```bash
agentbrain disable [options]
```

**Options:**
- `--remove-hooks` - Remove git hooks only
- `--remove-files` - Remove generated context files only (.agentbrain/ directory)
- `--remove-agent-files` - Remove agent config files (CLAUDE.md, .cursorrules, etc.)
- `--full` - Complete uninstall (removes everything)
- `--yes` - Skip confirmation prompts

**Interactive Mode:**
If you run `agentbrain disable` without options, you'll be prompted to select what to remove.

**Example:**
```bash
# Interactive mode - choose what to remove
agentbrain disable

# Remove only git hooks (keep context files)
agentbrain disable --remove-hooks

# Remove only generated files (keep hooks and agent files)
agentbrain disable --remove-files

# Complete uninstall without prompts
agentbrain disable --full --yes
```

**Re-enabling:**
To re-enable AgentBrain after disabling, simply run `agentbrain setup` again.

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
@.agentbrain/context.md
@.agentbrain/dependency-map.md
@.agentbrain/patterns.md
```

## Cost Estimates

All costs are approximate (as of January 2025):

| Operation | Tokens | Anthropic | OpenAI |
|-----------|--------|-----------|--------|
| Init (small) | 10-20K | $0.02-0.05 | $0.02-0.04 |
| Init (medium) | 30-50K | $0.08-0.15 | $0.07-0.12 |
| Spec | 3-5K | $0.01-0.02 | $0.01-0.02 |
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
git add .agentbrain/
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

- GitHub Issues: [Report bugs](https://github.com/benmalcom/agentbrain/issues)
- Documentation: [Full docs](https://github.com/benmalcom/agentbrain)

## License

MIT
