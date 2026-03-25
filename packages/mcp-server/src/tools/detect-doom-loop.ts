// MCP tool: detect_doom_loop - detect files modified repeatedly

import { analyzeDoomLoop } from '@agentbrain/core'
import type { DoomLoopResult } from '@agentbrain/core'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

/**
 * Expand path: handles ~, relative paths, etc.
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir())
  }
  return resolve(path)
}

export interface DetectDoomLoopInput {
  repo_path: string
  commit_count?: number
  threshold?: number
}

export async function detectDoomLoop(input: DetectDoomLoopInput): Promise<DoomLoopResult> {
  const { repo_path, commit_count = 10, threshold = 4 } = input

  const expandedPath = expandPath(repo_path)

  return await analyzeDoomLoop(expandedPath, commit_count, threshold)
}

export const detectDoomLoopSchema = {
  name: 'detect_doom_loop',
  description:
    'Detect doom loops by analyzing git history for files modified repeatedly in recent commits. Returns files appearing in 4+ of last 10 commits.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      commit_count: {
        type: 'number',
        description: 'Number of recent commits to analyze (default: 10)',
      },
      threshold: {
        type: 'number',
        description: 'Minimum commits for a file to be flagged (default: 4)',
      },
    },
    required: ['repo_path'],
  },
}
