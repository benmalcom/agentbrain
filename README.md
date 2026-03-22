# 🧠 AgentBrain

**Give your AI coding agent full codebase awareness.**

AgentBrain generates comprehensive context documentation that helps AI agents (Claude Code, Cursor, Windsurf) understand your entire project instantly.

[![npm version](https://img.shields.io/npm/v/@agentbrain/cli.svg)](https://www.npmjs.com/package/@agentbrain/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

- 🤖 **Smart Context Generation** - AI analyzes your codebase and creates intelligent documentation
- 📋 **Coding Standards** - Auto-generates standards files for different AI agents
- 🔄 **Session Handoffs** - Creates handoff docs from git diffs for session continuity
- 💾 **Cache-First** - Repeat runs on same commit are instant and free
- 🔌 **MCP Server** - Direct integration with Claude Desktop, Cursor, and Windsurf
- 🔐 **BYOK** - Use your own Anthropic or OpenAI API key
- ⚡ **Fast & Efficient** - Chunk+merge strategy optimizes costs

---

## 🚀 Quick Start

### Installation

```bash
npm install -g @agentbrain/cli
```

### Generate Context for Your Project

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

1. **`context.md`** - Complete project overview with architecture, tech stack, and file relationships
2. **`dependency-map.md`** - Visual map of how your services and modules connect
3. **patterns.md`** - Coding patterns, conventions, and best practices found in your code

---

## 📖 Usage

### CLI Commands

```bash
# Generate context documentation
agentbrain init

# Generate coding standards
agentbrain standards

# Generate session handoff
agentbrain handoff

# Manage API key
agentbrain config
```

### Use with AI Agents

**Claude Code:**
```markdown
<!-- Reference in your prompts or CLAUDE.md -->
@agentbrain/context.md
@agentbrain/dependency-map.md
@agentbrain/patterns.md
```

**Cursor & Windsurf:**
```bash
# Generate agent-specific rules
agentbrain standards
# Creates .cursor/rules and .windsurfrules automatically
```

---

## 🔌 MCP Server Integration

Connect AgentBrain directly to your AI agent for seamless access:

```bash
# Install MCP server
npm install -g @agentbrain/mcp-server

# Configure Claude Desktop
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "agentbrain": {
      "command": "agentbrain-mcp"
    }
  }
}
```

Now your agent can scan repos, load context, and save handoffs automatically!

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
| **Standards** | $0.01-0.02 | $0.01-0.02 | $0.01-0.02 |
| **Handoff** | $0.01 | $0.01 | $0.01 |

**Cache-first design:** Repeat runs on the same git commit are instant and free! 🎉

---

## 🛠️ Workflow Examples

### Daily Development

```bash
# Morning: Load context into your agent
agentbrain init  # Free if cached

# During work: Agent has full project context
# ... code with AI assistance ...

# End of day: Save handoff
agentbrain handoff --goal "Implemented user authentication"
```

### New Team Member Onboarding

```bash
cd /path/to/project
agentbrain init
agentbrain standards

# New dev reads agentbrain/context.md
# Their AI agent reads the same docs
# Everyone on same page instantly! 🚀
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
- **GitHub**: [yourusername/agentbrain](https://github.com/yourusername/agentbrain)
- **Issues**: [Report bugs](https://github.com/yourusername/agentbrain/issues)
- **Discussions**: [Ask questions](https://github.com/yourusername/agentbrain/discussions)

---

<div align="center">

**Made with 🧠 by developers, for developers**

[Get Started](#-quick-start) • [Documentation](#-documentation) • [GitHub](https://github.com/yourusername/agentbrain)

</div>
