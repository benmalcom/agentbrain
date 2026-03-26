// MCP tool: load_context - load context docs at session start

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import {
  loadAIConfig,
  generateContext,
  getCachedDoc,
  getGitHash,
  loadCache,
  getPendingDoomForMCP,
  type DoomWarningForMCP,
} from '@agentbrain/core'

/**
 * Expand path: handles ~, relative paths, etc.
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir())
  }
  return resolve(path)
}

export interface LoadContextInput {
  repo_path: string
  force_refresh?: boolean
}

export interface LoadContextOutput {
  content: string
  fromCache: boolean
  tokensUsed: number
  stale?: boolean
  cached_sha?: string
  current_sha?: string
  message?: string
  doom_warning?: DoomWarningForMCP | null
}

export async function loadContext(input: LoadContextInput): Promise<LoadContextOutput> {
  const { repo_path, force_refresh = false } = input

  // Expand path to handle ~, relative paths, etc.
  const expandedPath = expandPath(repo_path)

  const contextDir = join(expandedPath, '.agentbrain')

  // Get current git hash for staleness check
  const currentGitHash = await getGitHash(expandedPath)

  // Try to load from disk first
  const contextPath = join(contextDir, 'context.md')
  const depMapPath = join(contextDir, 'dependency-map.md')
  const patternsPath = join(contextDir, 'patterns.md')

  const allExist = existsSync(contextPath) && existsSync(depMapPath) && existsSync(patternsPath)

  if (!force_refresh && allExist) {
    // Load from disk
    const context = await readFile(contextPath, 'utf-8')
    const depMap = await readFile(depMapPath, 'utf-8')
    const patterns = await readFile(patternsPath, 'utf-8')

    const combined = `# Repository Context\n\n${context}\n\n---\n\n# Dependency Map\n\n${depMap}\n\n---\n\n# Patterns\n\n${patterns}`

    // Check if cached git hash matches current HEAD
    const cache = await loadCache(expandedPath)
    const isStale = cache && cache.gitHash !== currentGitHash

    // Check for doom loop warnings
    const doomWarning = await getPendingDoomForMCP(expandedPath)

    return {
      content: combined,
      fromCache: true,
      tokensUsed: 0,
      ...(isStale && {
        stale: true,
        cached_sha: cache.gitHash,
        current_sha: currentGitHash,
        message: 'Context may be outdated. Run agentbrain init to refresh.',
      }),
      doom_warning: doomWarning,
    }
  }

  // Check cache validity (using currentGitHash from above)
  const cachedContext = await getCachedDoc(expandedPath, currentGitHash, 'context')
  const cachedDepMap = await getCachedDoc(expandedPath, currentGitHash, 'dependency-map')
  const cachedPatterns = await getCachedDoc(expandedPath, currentGitHash, 'patterns')

  if (!force_refresh && cachedContext && cachedDepMap && cachedPatterns) {
    const combined = `# Repository Context\n\n${cachedContext.content}\n\n---\n\n# Dependency Map\n\n${cachedDepMap.content}\n\n---\n\n# Patterns\n\n${cachedPatterns.content}`

    // Check if cached git hash matches current HEAD
    const cache = await loadCache(expandedPath)
    const isStale = cache && cache.gitHash !== currentGitHash

    // Check for doom loop warnings
    const doomWarning = await getPendingDoomForMCP(expandedPath)

    return {
      content: combined,
      fromCache: true,
      tokensUsed: 0,
      ...(isStale && {
        stale: true,
        cached_sha: cache.gitHash,
        current_sha: currentGitHash,
        message: 'Context may be outdated. Run agentbrain init to refresh.',
      }),
      doom_warning: doomWarning,
    }
  }

  // Need to generate - requires API key (only loaded if we reach this point)
  const aiConfig = await loadAIConfig()

  // Generate new context
  const result = await generateContext({
    repoPath: expandedPath,
    aiConfig,
    useCache: !force_refresh,
  })

  const combined = result.docs
    .map((doc) => `# ${doc.type}\n\n${doc.content}`)
    .join('\n\n---\n\n')

  // Check for doom loop warnings
  const doomWarning = await getPendingDoomForMCP(expandedPath)

  // Newly generated content is never stale
  return {
    content: combined,
    fromCache: false,
    tokensUsed: result.totalTokens,
    doom_warning: doomWarning,
  }
}

export const loadContextSchema = {
  name: 'load_context',
  description:
    'Load combined context documentation (context.md + dependency-map.md + patterns.md). Reads from disk if files exist (no API key needed). Only generates new context if files missing (requires API key). Cached by git hash - repeat calls are free.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      force_refresh: {
        type: 'boolean',
        description: 'Force regeneration even if cache is valid (default: false)',
      },
    },
    required: ['repo_path'],
  },
}
