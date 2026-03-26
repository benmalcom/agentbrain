# @agentbrain/cli

> Smart context generation for coding agents - Keep AI assistants in sync with your codebase

Command-line interface for AgentBrain. Automatically generates and maintains context documentation that helps coding agents (Claude, Cursor, Windsurf) understand your codebase instantly.

[![npm version](https://img.shields.io/npm/v/@agentbrain/cli.svg)](https://www.npmjs.com/package/@agentbrain/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Installation

### Global Installation (Recommended)

```bash
npm install -g @agentbrain/cli
```

### Local Installation

```bash
npm install --save-dev @agentbrain/cli
```

### Verify Installation

```bash
agentbrain --version
```

---

## Quick Start

### One-Command Setup

```bash
cd /path/to/your/project
agentbrain setup
```

**That's it!** AgentBrain now:
- ✓ Generates context automatically on every commit
- ✓ Injects loading instructions into your agent files
- ✓ Detects and warns about doom loops
- ✓ Keeps everything in sync with your codebase

### What Gets Created

- `.agentbrain/context.md` - Full repository intelligence
- `.agentbrain/dependency-map.md` - Service relationships
- `.agentbrain/patterns.md` - Coding patterns and conventions
- `CLAUDE.md` / `.cursorrules` / `.windsurfrules` - Agent loading instructions
- `.git/hooks/post-commit` - Smart auto-regeneration hook

---

## Core Concepts

### Smart Context Generation

AgentBrain analyzes your codebase and generates three intelligence documents:

1. **Context** - Architecture, key files, and technical overview
2. **Dependency Map** - How services/modules relate to each other
3. **Patterns** - Coding patterns, conventions, and best practices

### Automatic Regeneration

After setup, context updates automatically in the background when you commit **source file changes**. Commits complete instantly (~0.05s) while regeneration happens in the background.

**Smart Filtering:** Only regenerates when source code changes (skips docs/config updates to save time and API costs).

### Doom Loop Detection

AgentBrain automatically detects when you're modifying the same files repeatedly in commits - a sign you may be stuck in a loop. When detected:

- ⚠ Warning displayed on next CLI command
- 🔔 Alert included in MCP tool responses
- 📝 Appended to handoff documents
- 💡 Suggests running `agentbrain spec` to plan a fix

**Check manually:**
```bash
agentbrain doom
```

---

## Commands

### `setup` - Complete Automated Setup

One-command setup for AgentBrain in your repository.

```bash
agentbrain setup [options]
```

**Options:**
- `--path <path>` - Repository path (default: current directory)
- `--skip-hooks` - Skip git hooks installation
- `--skip-agent-files` - Skip agent file injection
- `--no-confirm` - Skip all confirmation prompts

**What it does:**
1. Detects which agents you use (Claude Code, Cursor, Windsurf)
2. Generates initial context documentation
3. Injects context loading instructions
4. Installs smart git hooks
5. Sets up doom loop detection

**Cost:** ~$0.02-0.05 for initial generation (cached repeats are free)

---

### `init` - Regenerate Context

Manually regenerate all context documentation.

```bash
agentbrain init [options]
```

**Options:**
- `--path <path>` - Repository path
- `--no-confirm` - Skip confirmation prompt
- `--silent` - Suppress output (for scripts)

**Use when:**
- You want to force a fresh regeneration
- Context feels stale or inaccurate
- After major codebase changes

**Cost:** ~$0.02-0.05 per regeneration (same git hash = free from cache)

---

### `spec` - Create Task Specifications

Generate AI-guided task specifications with problem analysis and architecture planning.

```bash
agentbrain spec "<task description>" [options]
```

**Options:**
- `--path <path>` - Repository path
- `--load <slug>` - Load existing spec by slug

**Examples:**
```bash
# Create new spec
agentbrain spec "add user authentication with OAuth"

# Load existing spec
agentbrain spec --load add-user-authentication
```

**What it creates:**
- Problem analysis and context
- Technical approach and architecture
- Implementation steps
- Testing strategy
- Done criteria

**Specs are saved to:** `.agentbrain/specs/<task-slug>.md`

**Cost:** ~$0.01-0.03 per spec generation

---

### `doom` - Detect Doom Loops

Analyze git history to detect if you're modifying the same files repeatedly.

```bash
agentbrain doom [options]
```

**Options:**
- `--path <path>` - Repository path
- `--commits <n>` - Number of recent commits to analyze (default: 10)
- `--threshold <n>` - Minimum occurrences to flag (default: 4)
- `--json` - Output as JSON for programmatic use

**Example Output:**
```
Analyzing last 10 commits...

⚠ Doom loop detected!

These files appear repeatedly:
  apps/api/src/main.ts (9 times · 90%)
  apps/api/src/auth.ts (6 times · 60%)

Suggestions:
  → Stop coding. Investigate root cause first.
  → Run: agentbrain spec "fix [problem description]"
```

**Automatic Detection:**
After commits, doom detection runs in the background. Warning shown on next command if detected.

---

### `doctor` - Health Diagnostics

Run health checks on your AgentBrain setup.

```bash
agentbrain doctor [options]
```

**Options:**
- `--path <path>` - Repository path
- `--json` - Output as JSON

**Checks:**
- ✓ Git repository status
- ✓ Context files exist and are valid
- ✓ Agent files are configured
- ✓ Git hooks installed correctly
- ✓ API configuration

**Use when:**
- Setup isn't working as expected
- Context generation fails
- Git hooks not firing

---

### `status` - Auto-Update Status

View status of background context updates.

```bash
agentbrain status [options]
```

**Options:**
- `--path <path>` - Repository path

**Shows:**
- Recent update history from `.agentbrain/update.log`
- Success/failure status
- Update duration
- Git hash for each update

---

### `standards` - Generate Coding Standards

Generate coding standards documentation based on your codebase patterns.

```bash
agentbrain standards [options]
```

**Options:**
- `--path <path>` - Repository path

**Creates:** `.agentbrain/standards.md`

**Cost:** ~$0.01-0.02 per generation

---

### `handoff` - Generate Session Handoff

Generate session handoff document with recent changes and context.

```bash
agentbrain handoff [options]
```

**Options:**
- `--path <path>` - Repository path
- `--goal <goal>` - Session goal (optional)
- `--commits <n>` - Number of recent commits (default: 5)

**Creates:** `.agentbrain/handoff.md`

**Includes:**
- Recent changes summary
- Session context
- Next steps recommendations
- ⚠ Doom loop warning (if detected)

**Cost:** ~$0.01-0.02 per generation

---

### `config` - Configure API Settings

Configure AI provider API keys and settings.

```bash
agentbrain config
```

**Interactive setup for:**
- Provider selection (OpenAI, Anthropic, or both)
- API key configuration
- Model selection

**Supports:**
- OpenAI (GPT-4, GPT-4 Turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)

---

### `disable` - Disable AgentBrain

Disable AgentBrain features in your repository.

```bash
agentbrain disable [options]
```

**Options:**
- `--path <path>` - Repository path
- `--remove-hooks` - Remove git hooks
- `--remove-agent-files` - Remove agent file modifications

**Use when:**
- Temporarily disabling automation
- Troubleshooting issues
- Removing AgentBrain from project

**Note:** Does not delete `.agentbrain/` directory or context files.

---

## MCP Integration

AgentBrain provides a Model Context Protocol (MCP) server that enables AI agents to access repository intelligence directly.

**Install MCP Server:**
```bash
npm install -g @agentbrain/mcp-server
```

**See:** [@agentbrain/mcp-server](https://www.npmjs.com/package/@agentbrain/mcp-server) for setup instructions.

**MCP Tools Include Doom Warnings:**
- `load_context` - Returns `doom_warning` field if loop detected
- `load_spec` - Returns `doom_warning` field if loop detected
- `save_handoff` - Appends doom section to handoff document

---

## Troubleshooting

### Context Not Regenerating on Commits

**Check git hooks:**
```bash
agentbrain doctor
```

**Verify hook is installed:**
```bash
cat .git/hooks/post-commit
# or for Husky:
cat .husky/post-commit
```

**Reinstall hooks:**
```bash
agentbrain disable --remove-hooks
agentbrain setup
```

---

### Hook Errors After Commits

**Check update log:**
```bash
cat .agentbrain/update.log
```

**Common issues:**
- API key not configured: Run `agentbrain config`
- Permission errors: Check file permissions on `.agentbrain/`
- Path issues: Hook uses fallback paths to find `agentbrain` binary

---

### Context Feels Stale

**Force regeneration:**
```bash
agentbrain init --no-confirm
```

**Check cache:**
Cache is tied to git hash. If you haven't committed changes, old cache is used.

---

### Doom Loop False Positives

**Adjust sensitivity:**
```bash
# Check last 15 commits, flag if file appears 6+ times
agentbrain doom --commits 15 --threshold 6
```

**Excluded patterns:**
- Lock files (package-lock.json, etc.)
- AgentBrain files (CLAUDE.md, .cursorrules, etc.)
- Markdown files

---

### API Costs Too High

**Smart regeneration already optimized:**
- Only regenerates on source file changes
- Skips docs/config updates
- Caches by git hash

**Further reduce costs:**
- Use `--skip-hooks` during development sprints
- Manually regenerate only when needed: `agentbrain init`
- Disable temporarily: `agentbrain disable`

---

### Husky Compatibility

AgentBrain detects and supports Husky automatically.

**Husky v9+ (recommended):**
Hook installs directly to `.husky/post-commit`

**Custom hook paths:**
Detects `git config core.hooksPath` and installs there

**No conflicts:** AgentBrain hook runs alongside existing hooks

---

## Files & Directories

### Generated Files

```
.agentbrain/
├── context.md              # Full repository intelligence
├── dependency-map.md       # Service relationships
├── patterns.md             # Coding patterns
├── standards.md            # Coding standards (optional)
├── handoff.md             # Session handoff (optional)
├── update.log             # Auto-update history
└── specs/                 # Task specifications
    └── <task-slug>.md
```

### Agent Files (Modified)

- `CLAUDE.md` - Claude Code loading instructions
- `.cursorrules` - Cursor loading instructions
- `.windsurfrules` - Windsurf loading instructions

### Git Hooks

- `.git/hooks/post-commit` - Standard installation
- `.husky/post-commit` - Husky installation

---

## Best Practices

### When to Use AgentBrain

✅ **Good for:**
- Active development with AI assistants
- Onboarding new developers
- Complex codebases with multiple services
- Keeping AI agents in sync with changes

❌ **Skip if:**
- Early prototyping (context not stable yet)
- API costs are a major concern
- Repository is < 10 files

### Workflow Tips

1. **Initial setup:** Run `agentbrain setup` once
2. **Let automation work:** Commits regenerate context automatically
3. **Check doom warnings:** If shown, investigate before continuing
4. **Use specs:** Plan complex tasks with `agentbrain spec`
5. **Handoff cleanly:** Generate handoff at session end

### Cost Management

- Initial setup: ~$0.02-0.05
- Auto-regeneration: ~$0.02-0.05 per commit (only on source changes)
- Specs: ~$0.01-0.03 each
- **Expected monthly cost:** $1-5 for typical projects

---

## Links

- **npm:** https://www.npmjs.com/package/@agentbrain/cli
- **GitHub:** https://github.com/benmalcom/agentbrain
- **MCP Server:** https://www.npmjs.com/package/@agentbrain/mcp-server
- **Core Library:** https://www.npmjs.com/package/@agentbrain/core

---

## License

MIT © AgentBrain
