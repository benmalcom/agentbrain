// save-handoff.ts - MCP tool to save handoff content (no AI generation)

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

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
  content: string
}

export interface SaveHandoffOutput {
  filePath: string
}

export async function saveHandoff(input: SaveHandoffInput): Promise<SaveHandoffOutput> {
  const { repo_path, content } = input

  const expandedPath = expandPath(repo_path)

  // Ensure .agentbrain directory exists
  const outputDir = join(expandedPath, '.agentbrain')
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  // Write handoff file
  const filePath = join(outputDir, 'handoff.md')
  await writeFile(filePath, content, 'utf-8')

  return {
    filePath: '.agentbrain/handoff.md',
  }
}

export const saveHandoffSchema = {
  name: 'save_handoff',
  description:
    'Save a session handoff document to disk. The agent provides the handoff content (already written), and this tool saves it to .agentbrain/handoff.md. No AI calls - pure file write.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      content: {
        type: 'string',
        description: 'Full handoff content in markdown format (written by agent)',
      },
    },
    required: ['repo_path', 'content'],
  },
}
