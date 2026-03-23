# AgentBrain Project Rules

This is the AgentBrain project - a tool for generating context documentation for AI coding agents.

## Tech Stack
- TypeScript
- Node.js
- Turborepo monorepo


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

Last updated: 2026-03-23 | Git: 9fa1eef1
<!-- End AgentBrain Section -->
