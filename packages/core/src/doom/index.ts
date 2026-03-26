// Doom loop detection - identifies files modified repeatedly in recent commits

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { readFile, appendFile } from 'node:fs/promises'
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

export interface DoomWarningForMCP {
  detected: boolean
  files: string[]
  message: string
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

/**
 * Check for pending doom warnings in update.log
 * Returns warning message if doom detected and not yet shown
 */
export async function checkPendingDoomWarning(repoPath: string): Promise<string | null> {
  const updateLogPath = join(repoPath, '.agentbrain', 'update.log')

  // Check if update log exists
  if (!existsSync(updateLogPath)) {
    return null
  }

  // Get current git hash
  let currentHash: string
  try {
    const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: repoPath })
    currentHash = stdout.trim()
  } catch {
    return null // Not a git repo or no commits
  }

  // Read update log
  const logContent = await readFile(updateLogPath, 'utf-8')
  const lines = logContent.split('\n')

  // Check if already shown for this hash
  const doomShownPattern = `DOOM_SHOWN | Git: ${currentHash}`
  if (lines.some((line) => line.includes(doomShownPattern))) {
    return null // Already shown
  }

  // Find DOOM entries for current hash
  const doomPattern = `| Git: ${currentHash} | DOOM | detected`
  const hasDoom = lines.some((line) => line.includes(doomPattern))

  if (!hasDoom) {
    return null // No doom detected
  }

  // Mark as shown
  await appendFile(updateLogPath, `DOOM_SHOWN | Git: ${currentHash}\n`, 'utf-8')

  // Run live doom analysis to get current file details
  const result = await analyzeDoomLoop(repoPath)

  if (!result.detected || result.files.length === 0) {
    return null // False alarm or already resolved
  }

  // Format warning message with file details
  const fileList = result.files
    .map((f) => `  ${f.path} (${f.commitCount} times · ${f.percentage}%)`)
    .join('\n')

  return `⚠ AgentBrain: doom loop detected on last commit
${fileList}
→ Stop coding. Investigate root cause first.
→ Run: agentbrain spec "fix [problem description]"
`
}

/**
 * Get pending doom warning for MCP tool responses
 * Unlike checkPendingDoomWarning, this does NOT mark as shown
 * since MCP tools are stateless
 */
export async function getPendingDoomForMCP(repoPath: string): Promise<DoomWarningForMCP | null> {
  const updateLogPath = join(repoPath, '.agentbrain', 'update.log')

  // Check if update log exists
  if (!existsSync(updateLogPath)) {
    return null
  }

  // Get current git hash
  let currentHash: string
  try {
    const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: repoPath })
    currentHash = stdout.trim()
  } catch {
    return null // Not a git repo or no commits
  }

  // Read update log
  const logContent = await readFile(updateLogPath, 'utf-8')
  const lines = logContent.split('\n')

  // Find DOOM entries for current hash
  const doomPattern = `| Git: ${currentHash} | DOOM | detected`
  const hasDoom = lines.some((line) => line.includes(doomPattern))

  if (!hasDoom) {
    return null // No doom detected
  }

  // Run live doom analysis to get current file details
  const result = await analyzeDoomLoop(repoPath)

  if (!result.detected || result.files.length === 0) {
    return null // False alarm or already resolved
  }

  // Format file list with details
  const fileList = result.files.map((f) => `${f.path} (${f.commitCount} times · ${f.percentage}%)`)

  return {
    detected: true,
    files: fileList,
    message: 'Doom loop detected. Stop coding. Investigate root cause first.',
  }
}
