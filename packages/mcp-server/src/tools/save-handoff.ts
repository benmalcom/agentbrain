// MCP tool: save_handoff - save handoff at session end

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { loadAIConfig, generateHandoff } from '@agentbrain/core'

/**
 * Expand path: handles ~, relative paths, etc.
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir())
  }
  return resolve(path)
}

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

  // Expand path to handle ~, relative paths, etc.
  const expandedPath = expandPath(repo_path)

  // Load AI config
  const aiConfig = await loadAIConfig()

  // Generate handoff
  const result = await generateHandoff({
    repoPath: expandedPath,
    aiConfig,
    goal,
  })

  // Write to disk
  const outputDir = join(expandedPath, 'agentbrain')
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
