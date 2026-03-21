// MCP tool: save_handoff - save handoff at session end

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadAIConfig, generateHandoff } from '@agentbrain/core'

export interface SaveHandoffInput {
  repo_path: string
  goal?: string
}

export interface SaveHandoffOutput {
  content: string
  filePath: string
  tokensUsed: number
}

export async function saveHandoff(input: SaveHandoffInput): Promise<SaveHandoffOutput> {
  const { repo_path, goal } = input

  // Load AI config
  const aiConfig = await loadAIConfig()

  // Generate handoff
  const result = await generateHandoff({
    repoPath: repo_path,
    aiConfig,
    goal,
  })

  // Write to disk
  const outputDir = join(repo_path, 'agentbrain')
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  const filePath = join(outputDir, 'handoff.md')
  await writeFile(filePath, result.doc.content, 'utf-8')

  return {
    content: result.doc.content,
    filePath: 'agentbrain/handoff.md',
    tokensUsed: result.tokenCount,
  }
}

export const saveHandoffSchema = {
  name: 'save_handoff',
  description:
    'Generate and save handoff document from git diff and recent commits. Creates agentbrain/handoff.md with session summary.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      goal: {
        type: 'string',
        description: 'Optional session goal or objective to include in handoff',
      },
    },
    required: ['repo_path'],
  },
}
