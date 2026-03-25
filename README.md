# 🧠 AgentBrain

**Give your AI coding agent full codebase awareness.**

AgentBrain generates comprehensive context documentation that helps AI agents (Claude Code, Cursor, Windsurf) understand your entire project instantly.

[![npm version](https://img.shields.io/npm/v/@agentbrain/cli.svg)](https://www.npmjs.com/package/@agentbrain/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🚀 **One-Command Setup** - Complete automation with `agentbrain setup`
- 🔄 **Background Auto-Regeneration** - Git commits complete instantly, context updates in background
- 🎯 **Auto-Injection** - Automatically injects loading instructions into agent files
- 🤖 **Smart Context Generation** - AI analyzes your codebase and creates intelligent navigation guides
- 📊 **Large Repo Support** - Adaptive file selection (150+ files for repos >10k files)
- 📝 **Spec-Driven Development** - Generate structured task specs with AI-guided prompts
- 📋 **Coding Standards** - Auto-generates standards files for different AI agents
- 🔄 **Session Handoffs** - Creates handoff docs from git diffs for session continuity
- 💾 **Cache-First** - Repeat runs on same commit are instant and free
- 🔌 **MCP Server** - Direct integration with Claude Desktop, Cursor, and Windsurf
- 🔐 **BYOK** - Use your own Anthropic or OpenAI API key
- ⚡ **Fast & Efficient** - 2-3x faster with parallel generation (10x concurrency)
- 🧪 **Fully Tested** - 64 comprehensive tests covering core functionality
- 🛑 **Easy Disable** - `agentbrain disable` for clean uninstall

---

## 🚀 Quick Start

### Installation

```bash
npm install -g @agentbrain/cli
```

### One-Command Setup

```bash
# Navigate to your project
cd /path/to/your/project

# Run automated setup (one time)
agentbrain setup
```

**That's it!** AgentBrain now:
- ✅ Auto-generates context when you commit source changes
- ✅ Injects loading instructions into your agent files (CLAUDE.md, .cursorrules, etc.)
- ✅ Keeps everything in sync automatically

### Manual Setup (Advanced)

```bash
# Navigate to your project
cd /path/to/your/project

# Configure your API key (one time)
agentbrain config

# Preview what it will generate (FREE)
agentbrain init --dry-run

# Generate context docs (~$0.02-0.05)
agentbrain init
```

### What Gets Created

AgentBrain generates three powerful documentation files in `agentbrain/`:

1. **`context.md`** - Navigation guide with exact file paths and function names (not generic descriptions)
2. **`dependency-map.md`** - Visual map showing actual imports and code dependencies
3. **`patterns.md`** - Coding patterns, conventions, and best practices found in your code

**Note:** Context updates run in the background after git commits, so your workflow is never interrupted.

---

## 📖 Usage

### CLI Commands

```bash
# One-command setup (recommended)
agentbrain setup

# Generate context documentation
agentbrain init

# Generate task specification
agentbrain spec

# Generate coding standards
agentbrain standards

# Generate session handoff
agentbrain handoff

# Manage API key
agentbrain config

# Disable/uninstall AgentBrain
agentbrain disable                    # Interactive mode
agentbrain disable --remove-hooks     # Remove only git hooks
agentbrain disable --full --yes       # Complete uninstall
```

### Use with AI Agents

After running `agentbrain setup`, your agents automatically load context:

**Claude Code CLI:**
- Reads `CLAUDE.md` automatically from project root
- AgentBrain injects loading instructions automatically

**Cursor:**
- Reads `.cursorrules` (or `.cursor/rules` for legacy setups) automatically
- AgentBrain injects loading instructions automatically

**Windsurf:**
- Reads `.windsurfrules` automatically
- AgentBrain injects loading instructions automatically

**No manual action needed!** Just start coding and your agent has full context.

---

## 🔌 MCP Server Integration

Connect AgentBrain directly to your AI agent for seamless access:

```bash
# Configure Claude Desktop
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "agentbrain": {
      "command": "npx",
      "args": ["-y", "@agentbrain/mcp-server"]
    }
  }
}
```

Now your agent can scan repos, load context, and save handoffs automatically!

**Note:** No installation needed - `npx` handles package resolution automatically.

---

## 💡 How It Works

### Intelligent Analysis

```
┌─────────────┐
│ Scan Repo   │  Analyzes file tree, scores relevance
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Summarize   │  Fast model summarizes each file independently
└──────┬──────┘  (Batch processing with concurrency)
       │
       ▼
┌─────────────┐
│ Synthesize  │  Mid model merges summaries into comprehensive docs
└──────┬──────┘  (context.md, dependency-map.md, patterns.md)
       │
       ▼
┌─────────────┐
│ Cache       │  Git-hash keyed - instant repeat access
└─────────────┘
```

### Tiered Model Strategy

- **Fast models** (Haiku/GPT-4o-mini) - File-level summaries
- **Mid models** (Sonnet/GPT-4o) - Context synthesis
- **Smart models** (Opus/GPT-4.1) - Reserved for complex reasoning (future)

This approach:
- ✅ Minimizes costs
- ✅ Prevents context overflow
- ✅ Scales to large repositories

---

## 📦 Packages

| Package | Purpose | Install |
|---------|---------|---------|
| **[@agentbrain/cli](./packages/cli)** | Command-line interface | `npm install -g @agentbrain/cli` |
| **[@agentbrain/core](./packages/core)** | Core library | `npm install @agentbrain/core` |
| **[@agentbrain/mcp-server](./packages/mcp-server)** | MCP server for agents | `npm install -g @agentbrain/mcp-server` |

---

## 💰 Cost

Typical costs (as of January 2025):

| Operation | Small Repo | Medium Repo | Large Repo |
|-----------|------------|-------------|------------|
| **First run** | $0.02-0.05 | $0.08-0.15 | $0.15-0.30 |
| **Cached run** | $0.00 | $0.00 | $0.00 |
| **Spec** | $0.01-0.02 | $0.01-0.02 | $0.01-0.02 |
| **Standards** | $0.01-0.02 | $0.01-0.02 | $0.01-0.02 |
| **Handoff** | $0.01 | $0.01 | $0.01 |

**Cache-first design:** Repeat runs on the same git commit are instant and free! 🎉

---

## 🛠️ Workflow Examples

### Daily Development (Automated)

```bash
# One-time setup (first day)
cd /path/to/project
agentbrain setup

# That's it! Now just code normally:
# ... make changes ...
git commit -m "Add feature"
# → Commit completes instantly
# → Context updates in background (check .agentbrain/update.log)

# Agent already has context at session start!

# Generate handoff when needed
agentbrain handoff --goal "Implemented user authentication"
```

### New Team Member Onboarding

```bash
cd /path/to/project

# One command for complete setup
agentbrain setup

# Done! New dev and their AI agent both have full context
# No manual steps, no forgetting to load docs! 🚀
```

### Multi-Repo Projects

```bash
# Generate context for each microservice
for service in auth api frontend; do
  cd $service
  agentbrain init
done

# Agent can now understand entire system
```

---

## 🔑 Configuration

### API Keys

**Option 1: Environment Variables** (Recommended for CI/CD)
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

**Option 2: Stored Config** (Recommended for local use)
```bash
agentbrain config
# Stores securely at ~/.agentbrain/config.json
```

### Supported Providers

- **Anthropic** (Claude) - Haiku, Sonnet, Opus
- **OpenAI** (GPT) - GPT-4o-mini, GPT-4o, GPT-4.1

---

## 📚 Documentation

- **[Quick Start](./QUICKSTART.md)** - Get running in 2 minutes
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Publishing & sharing options
- **[CLI Documentation](./packages/cli/README.md)** - Command reference
- **[Core Library](./packages/core/README.md)** - API documentation
- **[MCP Server](./packages/mcp-server/README.md)** - Integration guide

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Anthropic Claude](https://www.anthropic.com) - AI provider
- [OpenAI GPT](https://openai.com) - AI provider
- [Model Context Protocol](https://modelcontextprotocol.io) - Agent integration standard
- [Turborepo](https://turbo.build) - Monorepo tooling
- [TypeScript](https://www.typescriptlang.org) - Language

---

## ⭐ Star History

If you find AgentBrain useful, please consider giving it a star on GitHub!

---

## 🔗 Links

- **npm**: [@agentbrain/cli](https://www.npmjs.com/package/@agentbrain/cli)
- **GitHub**: [benmalcom/agentbrain](https://github.com/benmalcom/agentbrain)
- **Issues**: [Report bugs](https://github.com/benmalcom/agentbrain/issues)
- **Discussions**: [Ask questions](https://github.com/benmalcom/agentbrain/discussions)

---

<div align="center">

**Made with 🧠 by developers, for developers**

[Get Started](#-quick-start) • [Documentation](#-documentation) • [GitHub](https://github.com/benmalcom/agentbrain)

</div>
