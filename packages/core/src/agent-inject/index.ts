// Agent file auto-injection utilities

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { AgentTarget } from '../types.js'
import { AGENT_FILE_PATHS } from '../types.js'

const INJECTION_MARKER_START = '<!-- AgentBrain Auto-Managed Section -->'
const INJECTION_MARKER_END = '<!-- End AgentBrain Section -->'

/**
 * Detect which agents are configured in the repository
 * For Cursor, checks both .cursorrules (modern) and .cursor/rules (legacy)
 */
export function detectAgents(repoPath: string): AgentTarget[] {
  const detected: AgentTarget[] = []

  for (const [agent, filePath] of Object.entries(AGENT_FILE_PATHS)) {
    const fullPath = join(repoPath, filePath)

    // Special case: Cursor supports both .cursorrules and .cursor/rules
    if (agent === 'cursor') {
      const modernPath = join(repoPath, '.cursorrules')
      const legacyPath = join(repoPath, '.cursor', 'rules')

      if (existsSync(modernPath) || existsSync(legacyPath)) {
        detected.push(agent as AgentTarget)
      }
    } else if (existsSync(fullPath)) {
      detected.push(agent as AgentTarget)
    }
  }

  return detected
}

/**
 * Generate context loading instructions for a specific agent
 */
function generateInstructions(agent: AgentTarget, gitHash: string): string {
  const timestamp = new Date().toISOString().split('T')[0]

  const baseInstructions = {
    'claude-code': `## AgentBrain Context (Auto-Managed)

**At the start of EVERY session, automatically load repository context:**

1. **Preferred:** Use the \`load_context\` MCP tool
2. **Fallback:** Read these files:
   - @.agentbrain/context.md
   - @.agentbrain/patterns.md
   - @.agentbrain/dependency-map.md

These files contain:
- Complete project architecture and tech stack
- All coding patterns and conventions
- Module dependencies and relationships
- Key files and their purposes

**Do not skip this step.** This context is essential for understanding the codebase.

Last updated: ${timestamp} | Git: ${gitHash.substring(0, 8)}`,

    cursor: `# AgentBrain Context (Auto-Managed)

At the start of every session, load repository context:

**Option 1 (Preferred):** Use MCP load_context tool
**Option 2 (Fallback):** Read these files:
- .agentbrain/context.md
- .agentbrain/patterns.md
- .agentbrain/dependency-map.md

This context includes project architecture, patterns, dependencies, and conventions.

Last updated: ${timestamp} | Git: ${gitHash.substring(0, 8)}`,

    windsurf: `# AgentBrain Context (Auto-Managed)

Load at session start:

**Preferred:** MCP load_context tool
**Fallback:** Read files:
- .agentbrain/context.md
- .agentbrain/patterns.md
- .agentbrain/dependency-map.md

Context includes: architecture, patterns, dependencies, standards.

Last updated: ${timestamp} | Git: ${gitHash.substring(0, 8)}`,
  }

  return baseInstructions[agent]
}

/**
 * Inject or update AgentBrain section in agent file
 * For Cursor, prefers .cursorrules but uses .cursor/rules if that's what exists
 */
export async function injectIntoAgentFile(
  repoPath: string,
  agent: AgentTarget,
  gitHash: string
): Promise<{ created: boolean; updated: boolean }> {
  let filePath = join(repoPath, AGENT_FILE_PATHS[agent])

  // Special case: Cursor supports both .cursorrules and .cursor/rules
  // Prefer modern .cursorrules, but use legacy path if it exists and modern doesn't
  if (agent === 'cursor') {
    const modernPath = join(repoPath, '.cursorrules')
    const legacyPath = join(repoPath, '.cursor', 'rules')

    if (existsSync(legacyPath) && !existsSync(modernPath)) {
      filePath = legacyPath
    } else {
      filePath = modernPath // Default to modern path for new files
    }
  }

  const instructions = generateInstructions(agent, gitHash)
  const section = `${INJECTION_MARKER_START}\n${instructions}\n${INJECTION_MARKER_END}`

  // Ensure directory exists
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    // Create new file with instructions
    await writeFile(filePath, section + '\n', 'utf-8')
    return { created: true, updated: false }
  }

  // File exists - update or append
  const content = await readFile(filePath, 'utf-8')

  // Check if section already exists
  if (content.includes(INJECTION_MARKER_START)) {
    // Update existing section
    const beforeMarker = content.substring(0, content.indexOf(INJECTION_MARKER_START))
    const afterMarker = content.substring(content.indexOf(INJECTION_MARKER_END) + INJECTION_MARKER_END.length)
    const newContent = beforeMarker + section + afterMarker

    await writeFile(filePath, newContent, 'utf-8')
    return { created: false, updated: true }
  } else {
    // Append section
    const separator = content.trim().endsWith('\n') ? '\n' : '\n\n'
    await writeFile(filePath, content + separator + section + '\n', 'utf-8')
    return { created: false, updated: true }
  }
}

/**
 * Inject into all detected agent files
 */
export async function injectIntoAllAgents(
  repoPath: string,
  gitHash: string
): Promise<{ agent: AgentTarget; created: boolean; updated: boolean }[]> {
  const agents = detectAgents(repoPath)
  const results = []

  for (const agent of agents) {
    const result = await injectIntoAgentFile(repoPath, agent, gitHash)
    results.push({ agent, ...result })
  }

  return results
}
