// Spec generation for spec-driven development

import { AIClient } from '../ai/client.js'
import { getCachedDoc } from '../cache/index.js'
import { loadAgentConfig } from '../config/agent-config.js'
import { getGitHash } from '../crawler/index.js'
import type { AIConfig, AgentTarget } from '../types.js'
import { AGENT_FILE_PATHS } from '../types.js'
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'

export interface SpecAnswers {
  problem: string
  approach: string
  outOfScope: string
  doneCriteria: string
  risks: string
}

export interface GenerateSpecResult {
  content: string
  slug: string
  filePath: string
  tokensUsed: number
  cost: number
}

/**
 * Convert task description to kebab-case slug
 */
function taskToSlug(task: string): string {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate spec content using AI
 */
export async function generateSpec(
  task: string,
  answers: SpecAnswers,
  repoPath: string,
  aiConfig: AIConfig
): Promise<{ content: string; tokensUsed: number; cost: number }> {
  const client = new AIClient(aiConfig)

  // Try to load context.md for implementation notes (limit to first 200 lines for speed)
  let contextContent = ''
  try {
    const gitHash = await getGitHash(repoPath)
    const cachedContext = await getCachedDoc(repoPath, gitHash, 'context')
    if (cachedContext) {
      // Only use first 200 lines to keep prompt small and fast
      const lines = cachedContext.content.split('\n').slice(0, 200)
      contextContent = lines.join('\n')
    }
  } catch {
    // Context not available, continue without it
  }

  const prompt = `Generate a structured spec for this task using the user's answers.

Task: "${task}"
Repo: ${basename(repoPath)}

Q1 (Problem): ${answers.problem}
Q2 (Approach): ${answers.approach}
Q3 (Out of scope): ${answers.outOfScope}
Q4 (Done criteria): ${answers.doneCriteria}
Q5 (Risks): ${answers.risks}

${contextContent ? `Context (first 200 lines):\n${contextContent}\n\n` : ''}

Output format:

# Spec: ${task}

*Created: ${new Date().toISOString().split('T')[0]} | Repo: ${basename(repoPath)}*

## Problem
[Q1 - clear and concise]

## Scope
**Out of scope:** [Q3]

## Acceptance Criteria
[Q4 as checklist, each line: "- [ ] ..."]

## Risks & Edge Cases
[Q5 as bullets]

## Implementation Notes
[Start with Q2 approach. Expand with: patterns from context, technical considerations, file suggestions. 4-6 bullets]

## Task Checklist
[Ordered tasks as "- [ ] ..." in dependency order]`

  const response = await client.generate(
    [{ role: 'user', content: prompt }],
    'fast',
    { maxTokens: 800, temperature: 0.3 }
  )

  const cost = client.calculateCost(response.tokenCount, 'fast')

  return {
    content: response.content,
    tokensUsed: response.tokenCount,
    cost,
  }
}

/**
 * Save spec file to agentbrain/specs/
 */
export async function saveSpec(
  repoPath: string,
  slug: string,
  content: string
): Promise<string> {
  const specsDir = join(repoPath, 'agentbrain', 'specs')

  if (!existsSync(specsDir)) {
    await mkdir(specsDir, { recursive: true })
  }

  const filePath = join(specsDir, `${slug}.md`)
  await writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * Inject spec reference into agent files
 */
export async function injectSpecReference(
  repoPath: string,
  slug: string
): Promise<void> {
  const config = await loadAgentConfig(repoPath)
  const agents: AgentTarget[] = config?.selectedAgents || ['claude-code']

  const specPath = `agentbrain/specs/${slug}.md`
  const reference = `\n\n---\n\n**Active Spec:** Read \`${specPath}\` before implementing this feature.\n`

  for (const agent of agents) {
    const agentFilePath = join(repoPath, AGENT_FILE_PATHS[agent])

    if (existsSync(agentFilePath)) {
      try {
        // Read existing content
        const content = await readFile(agentFilePath, 'utf-8')

        // Append spec reference if not already present
        if (!content.includes(`**Active Spec:** Read \`${specPath}\``)) {
          const separator = content.trim().endsWith('\n') ? '\n' : '\n\n'
          await writeFile(agentFilePath, content + separator + reference, 'utf-8')
        }
      } catch {
        // If injection fails, continue with other agents
      }
    }
  }
}

/**
 * List all available specs
 */
export async function listSpecs(repoPath: string): Promise<string[]> {
  const specsDir = join(repoPath, 'agentbrain', 'specs')

  if (!existsSync(specsDir)) {
    return []
  }

  const files = await readdir(specsDir)
  return files.filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''))
}

/**
 * Load a spec file by slug
 */
export async function loadSpec(repoPath: string, slug: string): Promise<string | null> {
  const filePath = join(repoPath, 'agentbrain', 'specs', `${slug}.md`)

  if (!existsSync(filePath)) {
    return null
  }

  const { readFile } = await import('node:fs/promises')
  return await readFile(filePath, 'utf-8')
}

/**
 * Main entry point - generate and save spec
 */
export async function createSpec(
  task: string,
  answers: SpecAnswers,
  repoPath: string,
  aiConfig: AIConfig
): Promise<GenerateSpecResult> {
  const slug = taskToSlug(task)

  const { content, tokensUsed, cost } = await generateSpec(task, answers, repoPath, aiConfig)

  const filePath = await saveSpec(repoPath, slug, content)

  await injectSpecReference(repoPath, slug)

  return {
    content,
    slug,
    filePath,
    tokensUsed,
    cost,
  }
}
