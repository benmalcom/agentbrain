// MCP tool: load_context - load context docs at session start

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { loadAIConfig, generateContext, getCachedDoc, getGitHash } from '@agentbrain/core'

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
}

export async function loadContext(input: LoadContextInput): Promise<LoadContextOutput> {
  const { repo_path, force_refresh = false } = input

  // Expand path to handle ~, relative paths, etc.
  const expandedPath = expandPath(repo_path)

  const contextDir = join(expandedPath, 'agentbrain')

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

    return {
      content: combined,
      fromCache: true,
      tokensUsed: 0,
    }
  }

  // Need to generate - requires API key
  const aiConfig = await loadAIConfig()
  const gitHash = await getGitHash(expandedPath)

  // Check cache validity
  const cachedContext = await getCachedDoc(expandedPath, gitHash, 'context')
  const cachedDepMap = await getCachedDoc(expandedPath, gitHash, 'dependency-map')
  const cachedPatterns = await getCachedDoc(expandedPath, gitHash, 'patterns')

  if (!force_refresh && cachedContext && cachedDepMap && cachedPatterns) {
    const combined = `# Repository Context\n\n${cachedContext.content}\n\n---\n\n# Dependency Map\n\n${cachedDepMap.content}\n\n---\n\n# Patterns\n\n${cachedPatterns.content}`

    return {
      content: combined,
      fromCache: true,
      tokensUsed: 0,
    }
  }

  // Generate new context
  const result = await generateContext({
    repoPath: expandedPath,
    aiConfig,
    useCache: !force_refresh,
  })

  const combined = result.docs
    .map((doc) => `# ${doc.type}\n\n${doc.content}`)
    .join('\n\n---\n\n')

  return {
    content: combined,
    fromCache: false,
    tokensUsed: result.totalTokens,
  }
}

export const loadContextSchema = {
  name: 'load_context',
  description:
    'Load combined context documentation (context.md + dependency-map.md + patterns.md). Cached by git hash - repeat calls are free.',
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
