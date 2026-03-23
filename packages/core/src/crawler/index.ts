// Repo scanner with intelligent file scoring

import { globby } from 'globby'
import * as ignoreModule from 'ignore'
import type { Ignore } from 'ignore'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { FileEntry, RepoScanResult } from '../types.js'

const execAsync = promisify(exec)

// Files to always include
const ALWAYS_INCLUDE = new Set([
  'README.md',
  'README.mdx',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
])

// Directories and patterns to always ignore
const ALWAYS_IGNORE = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '__pycache__',
  'coverage',
  '.turbo',
  '.cache',
  'vendor',
  '.env',
  '.env.*',
  '*.lock',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  '.agentbrain',
  'agentbrain',
]

// Supported code extensions
const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.swift',
  '.rb',
  '.php',
  '.cs',
  '.cpp',
  '.c',
  '.h',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.graphql',
  '.gql',
  '.prisma',
  '.sql',
])

// Entry point filenames (get bonus score)
const ENTRY_POINTS = new Set([
  'index',
  'main',
  'app',
  'server',
  'cli',
  'index.ts',
  'main.ts',
  'app.ts',
  'server.ts',
])

// Business logic keywords (always high priority)
const BUSINESS_LOGIC_KEYWORDS = [
  'contract',
  'protocol',
  'hook',
  'service',
  'api',
  'game',
  'bet',
  'flip',
  'payment',
  'auth',
  'wallet',
]

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.mjs': 'JavaScript (ESM)',
    '.cjs': 'JavaScript (CJS)',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.swift': 'Swift',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C/C++ Header',
    '.md': 'Markdown',
    '.mdx': 'MDX',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.graphql': 'GraphQL',
    '.gql': 'GraphQL',
    '.prisma': 'Prisma',
    '.sql': 'SQL',
  }
  return languageMap[ext] || 'Unknown'
}

/**
 * Calculate relevance score for a file
 */
export function calculateRelevanceScore(filePath: string): number {
  const base = basename(filePath)
  const baseNoExt = basename(filePath, extname(filePath))
  const dir = dirname(filePath)
  const lowerPath = filePath.toLowerCase()

  let score = 0

  // Always-include files get max score
  if (ALWAYS_INCLUDE.has(base)) {
    score += 100
  }

  // Business logic files get high priority (regardless of depth)
  const hasBusinessLogic = BUSINESS_LOGIC_KEYWORDS.some(keyword =>
    lowerPath.includes(keyword)
  )
  if (hasBusinessLogic) {
    score += 60
  }

  // High-value directories get bonus
  if (
    dir.includes('/hooks') ||
    dir.includes('/services') ||
    dir.includes('/lib') ||
    dir.includes('/api') ||
    dir.includes('/contracts') ||
    dir.includes('/components')
  ) {
    score += 40
  }

  // Entry points get bonus
  if (ENTRY_POINTS.has(baseNoExt) || ENTRY_POINTS.has(base)) {
    score += 50
  }

  // Config files get bonus
  if (base.includes('.config.') || base.includes('.setup.')) {
    score += 30
  }

  // Gentler penalty for directory depth (was -3, now -1.5)
  const depth = dir === '.' ? 0 : dir.split('/').length
  score -= depth * 1.5

  // Penalty for test files
  if (
    base.includes('.test.') ||
    base.includes('.spec.') ||
    dir.includes('__tests__') ||
    dir.includes('test')
  ) {
    score -= 10
  }

  return score
}

/**
 * Get git hash of current HEAD commit
 */
export async function getGitHash(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath })
    return stdout.trim()
  } catch {
    // Not a git repo or git not available
    return 'no-git'
  }
}

/**
 * Load .gitignore rules
 */
async function loadGitignore(repoPath: string): Promise<Ignore> {
  // @ts-expect-error - ignore module has non-standard ESM exports
  const ig = ignoreModule.default ? ignoreModule.default() : ignoreModule()
  const gitignorePath = join(repoPath, '.gitignore')

  if (existsSync(gitignorePath)) {
    const content = await readFile(gitignorePath, 'utf-8')
    ig.add(content)
  }

  // Add our always-ignore patterns
  ig.add(ALWAYS_IGNORE)

  return ig
}

/**
 * Scan repository and return relevant files with scores
 */
export async function scanRepository(
  repoPath: string,
  options?: {
    maxFiles?: number
    onProgress?: (msg: string) => void
  }
): Promise<RepoScanResult> {
  const { maxFiles = 100, onProgress } = options || {}

  onProgress?.('Scanning file tree...')

  // Load gitignore
  const ig = await loadGitignore(repoPath)

  // Find all files with supported extensions
  const allFiles = await globby('**/*', {
    cwd: repoPath,
    dot: false,
    absolute: false,
    onlyFiles: true,
    gitignore: false, // We handle gitignore manually
  })

  // Adaptive max files for large repos
  const adaptiveMaxFiles = allFiles.length > 10000 ? 150 : maxFiles

  onProgress?.(`Found ${allFiles.length} total files`)

  // Filter and score files
  const scoredFiles: Array<{ path: string; score: number; size: number; language: string }> = []

  for (const filePath of allFiles) {
    // Check if ignored
    if (ig.ignores(filePath)) {
      continue
    }

    const ext = extname(filePath)
    const base = basename(filePath)

    // Check if supported extension or always-include
    if (!SUPPORTED_EXTENSIONS.has(ext) && !ALWAYS_INCLUDE.has(base)) {
      continue
    }

    const score = calculateRelevanceScore(filePath)

    // Skip files with negative score
    if (score < 0) {
      continue
    }

    const fullPath = join(repoPath, filePath)
    const stats = await stat(fullPath)

    scoredFiles.push({
      path: filePath,
      score,
      size: stats.size,
      language: detectLanguage(filePath),
    })
  }

  // Sort by score (highest first) and take top N
  scoredFiles.sort((a, b) => b.score - a.score)
  const topFiles = scoredFiles.slice(0, adaptiveMaxFiles)

  onProgress?.(`Selected ${topFiles.length} relevant files`)

  const relevantFiles: FileEntry[] = topFiles.map((f) => ({
    path: f.path,
    size: f.size,
    language: f.language,
  }))

  const gitHash = await getGitHash(repoPath)

  return {
    root: repoPath,
    totalFiles: allFiles.length,
    relevantFiles,
    gitHash,
    scannedAt: new Date().toISOString(),
  }
}

/**
 * Read file content safely
 */
export async function readFileContent(
  repoPath: string,
  filePath: string
): Promise<string | null> {
  try {
    const fullPath = join(repoPath, filePath)
    const content = await readFile(fullPath, 'utf-8')
    return content
  } catch {
    return null
  }
}
