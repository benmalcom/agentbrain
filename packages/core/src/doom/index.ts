// Doom loop detection - identifies files modified repeatedly in recent commits

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const execAsync = promisify(exec)

export interface DoomFile {
  path: string
  commitCount: number
  percentage: number // e.g. 60% of last N commits
}

export interface DoomLoopResult {
  detected: boolean
  commitsAnalyzed: number
  files: DoomFile[]
}

/**
 * Files to exclude from doom loop detection
 */
const EXCLUDED_PATTERNS = [
  // Lock files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.lock',
  'Gemfile.lock',
  'poetry.lock',
  // AgentBrain files
  'CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  // Patterns
  /\.md$/,
  /^\.agentbrain\//,
]

/**
 * Check if a file should be excluded from analysis
 */
function shouldExclude(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some((pattern) => {
    if (typeof pattern === 'string') {
      return filePath === pattern || filePath.endsWith(`/${pattern}`)
    }
    return pattern.test(filePath)
  })
}

/**
 * Analyze git history to detect doom loops
 */
export async function analyzeDoomLoop(
  repoPath: string,
  commitCount = 10,
  threshold = 4
): Promise<DoomLoopResult> {
  // Verify git repo exists
  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    throw new Error('Not a git repository')
  }

  // Get last N commits with files changed
  const { stdout } = await execAsync(
    `git log --name-only --pretty=format: -n ${commitCount}`,
    { cwd: repoPath }
  )

  // Parse file list
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Count file occurrences
  const fileCounts = new Map<string, number>()
  for (const filePath of lines) {
    if (shouldExclude(filePath)) {
      continue
    }

    const count = fileCounts.get(filePath) || 0
    fileCounts.set(filePath, count + 1)
  }

  // Find files exceeding threshold
  const doomFiles: DoomFile[] = []
  for (const [path, count] of fileCounts.entries()) {
    if (count >= threshold) {
      doomFiles.push({
        path,
        commitCount: count,
        percentage: Math.round((count / commitCount) * 100),
      })
    }
  }

  // Sort by commit count (descending)
  doomFiles.sort((a, b) => b.commitCount - a.commitCount)

  return {
    detected: doomFiles.length > 0,
    commitsAnalyzed: commitCount,
    files: doomFiles,
  }
}
