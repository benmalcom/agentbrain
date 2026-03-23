# AgentBrain Project

This is a TypeScript monorepo for generating smart context documentation for AI coding agents.

## Project Structure

- `packages/core` - Core intelligence layer
- `packages/cli` - Command-line interface
- `packages/mcp-server` - Model Context Protocol server

## Tech Stack

- TypeScript (ESM modules)
- Node.js 18+
- Turbo (monorepo management)
- Anthropic & OpenAI SDKs


<!-- AgentBrain Auto-Managed Section -->
## AgentBrain Context (Auto-Managed)

**At the start of EVERY session, automatically load repository context:**

1. **Preferred:** Use the `load_context` MCP tool
2. **Fallback:** Read these files:
   - @agentbrain/context.md
   - @agentbrain/patterns.md
   - @agentbrain/dependency-map.md

These files contain:
- Complete project architecture and tech stack
- All coding patterns and conventions
- Module dependencies and relationships
- Key files and their purposes

**Do not skip this step.** This context is essential for understanding the codebase.

Last updated: 2026-03-23 | Git: 91bc84a5
<!-- End AgentBrain Section -->
