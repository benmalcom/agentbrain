# AgentBrain

A TypeScript monorepo CLI + MCP server that generates smart context docs for coding agents (Claude Code, Cursor, Windsurf).

## What is AgentBrain?

AgentBrain gives your coding agent full codebase awareness by generating intelligent context documentation.

### Features

- **Smart Context Generation**: Scans your repo and generates `context.md`, `dependency-map.md`, and `patterns.md`
- **Coding Standards**: Creates agent-specific rules files (CLAUDE.md, .cursorrules, .windsurfrules)
- **Session Handoffs**: Generates handoff docs from git diffs for continuity between sessions
- **Cache-First**: Git-hash based invalidation means repeat runs cost $0
- **BYOK**: Bring your own Anthropic or OpenAI API key
- **MCP Server**: Zero-cost mode for users with Claude Desktop/Cursor/Windsurf subscriptions

## Installation

```bash
npm install -g agentbrain
```

## Quick Start

### CLI Usage

```bash
# Generate context docs for your repo
agentbrain init

# Generate coding standards files
agentbrain standards

# Generate handoff doc from recent changes
agentbrain handoff

# Configure API key
agentbrain config
```

### MCP Server Usage

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agentbrain": {
      "command": "agentbrain-mcp"
    }
  }
}
```

## Architecture

This is a monorepo with three packages:

- **`packages/core`**: Shared intelligence layer (AI client, crawler, context generation)
- **`packages/cli`**: Command-line interface
- **`packages/mcp-server`**: Model Context Protocol server

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Type check
npm run typecheck

# Clean build artifacts
npm run clean
```

## How It Works

1. **Scan**: Analyzes your file tree with intelligent relevance scoring
2. **Summarize**: Uses fast models to summarize each relevant file independently
3. **Synthesize**: Uses mid-tier models to merge summaries into comprehensive docs
4. **Cache**: Stores results keyed by git hash - repeat runs are instant and free

## Cost

AgentBrain is designed to be extremely cost-effective:

- Typical repo scan: ~$0.02-0.05 USD
- Cached repeat runs: $0.00
- MCP mode with agent subscription: $0.00

## License

MIT
