// MCP tool: load_task_context - load task-focused context

import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { loadAIConfig, generateTaskContext } from '@agentbrain/core'

/**
 * Expand path: handles ~, relative paths, etc.
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir())
  }
  return resolve(path)
}

export interface LoadTaskContextInput {
  repo_path: string
  task: string
  max_files?: number
}

export interface LoadTaskContextOutput {
  content: string
  selectedFiles: number
  totalFilesScored: number
  tokensUsed: number
  cost: number
}

export async function loadTaskContext(
  input: LoadTaskContextInput
): Promise<LoadTaskContextOutput> {
  const { repo_path, task, max_files = 20 } = input

  // Expand path to handle ~, relative paths, etc.
  const expandedPath = expandPath(repo_path)

  // Load AI config
  const aiConfig = await loadAIConfig()

  // Generate task-focused context
  const result = await generateTaskContext({
    repoPath: expandedPath,
    aiConfig,
    task,
    maxFiles: max_files,
  })

  return {
    content: result.content,
    selectedFiles: result.selectedFiles.length,
    totalFilesScored: result.totalFilesScored,
    tokensUsed: result.tokens,
    cost: result.cost,
  }
}

export const loadTaskContextSchema = {
  name: 'load_task_context',
  description:
    'Generate task-focused context by scoring cached file summaries against a specific task. Near-zero cost on repeat calls since it re-uses cached summaries.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      task: {
        type: 'string',
        description:
          'Description of the task (e.g., "add OAuth login to auth module", "fix bug in payment processing")',
      },
      max_files: {
        type: 'number',
        description: 'Maximum number of relevant files to include (default: 20)',
      },
    },
    required: ['repo_path', 'task'],
  },
}
