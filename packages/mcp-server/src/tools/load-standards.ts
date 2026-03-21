// MCP tool: load_standards - read standards file for an agent

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { AGENT_FILE_PATHS } from '@agentbrain/core'
import type { AgentTarget } from '@agentbrain/core'

export interface LoadStandardsInput {
  repo_path: string
  agent: AgentTarget
}

export interface LoadStandardsOutput {
  content: string
  filePath: string
  agent: AgentTarget
}

export async function loadStandards(input: LoadStandardsInput): Promise<LoadStandardsOutput> {
  const { repo_path, agent } = input

  const relativePath = AGENT_FILE_PATHS[agent]
  const filePath = join(repo_path, relativePath)

  if (!existsSync(filePath)) {
    throw new Error(
      `Standards file not found: ${relativePath}. Run "agentbrain standards" to generate it.`
    )
  }

  const content = await readFile(filePath, 'utf-8')

  return {
    content,
    filePath: relativePath,
    agent,
  }
}

export const loadStandardsSchema = {
  name: 'load_standards',
  description:
    'Load coding standards file for a specific agent (Claude Code, Cursor, or Windsurf). Reads from disk - no AI call needed.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      agent: {
        type: 'string',
        enum: ['claude-code', 'cursor', 'windsurf'],
        description: 'Which agent to load standards for',
      },
    },
    required: ['repo_path', 'agent'],
  },
}
