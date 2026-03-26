// create-spec.ts - MCP tool to create task specifications

import { z } from 'zod'
import { createSpec as coreCreateSpec } from '@agentbrain/core'
import { loadAIConfig } from '@agentbrain/core'
import { resolve } from 'node:path'

export const createSpecSchema = {
  name: 'create_spec',
  description:
    'Create a task specification with AI-guided structure. Generates a spec file with problem statement, scope, acceptance criteria, and implementation notes based on repository context.',
  inputSchema: {
    type: 'object',
    properties: {
      repoPath: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      task: {
        type: 'string',
        description:
          'Brief task description (e.g., "add OAuth authentication")',
      },
      problem: {
        type: 'string',
        description: 'What problem does this solve? (1-2 sentences)',
      },
      approach: {
        type: 'string',
        description:
          'Your implementation approach or "not sure yet" if unknown',
      },
      outOfScope: {
        type: 'string',
        description: 'What should NOT be touched or changed',
      },
      doneCriteria: {
        type: 'string',
        description: 'What does "done" look like? (acceptance criteria)',
      },
      risks: {
        type: 'string',
        description: 'Any edge cases or risks to consider',
      },
      inject: {
        type: 'boolean',
        description:
          'Inject spec reference into agent files (CLAUDE.md, .cursorrules, etc.) [default: true]',
      },
    },
    required: ['repoPath', 'task', 'problem', 'doneCriteria'],
  },
} as const

const inputSchema = z.object({
  repoPath: z.string(),
  task: z.string(),
  problem: z.string(),
  approach: z.string().optional(),
  outOfScope: z.string().optional(),
  doneCriteria: z.string(),
  risks: z.string().optional(),
  inject: z.boolean().optional().default(true),
})

export type CreateSpecInput = z.infer<typeof inputSchema>

export async function createSpecTool(input: CreateSpecInput) {
  // Validate input
  const validated = inputSchema.parse(input)
  const repoPath = resolve(validated.repoPath)

  // Load AI config (will use env vars or stored config)
  const aiConfig = await loadAIConfig()

  // Build answers object for spec generation
  const answers = {
    problem: validated.problem,
    approach: validated.approach || 'not sure yet',
    outOfScope: validated.outOfScope || 'none specified',
    doneCriteria: validated.doneCriteria,
    risks: validated.risks || 'none specified',
  }

  // Use core createSpec function (handles everything: generate, save, inject)
  const result = await coreCreateSpec(
    validated.task,
    answers,
    repoPath,
    aiConfig
  )

  return {
    specPath: result.filePath.replace(repoPath, '').slice(1), // Relative path
    slug: result.slug,
    content: result.content,
    tokensUsed: result.tokensUsed,
    cost: result.cost,
    injected: true, // coreCreateSpec always injects
  }
}
