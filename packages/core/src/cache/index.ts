// Git-hash based cache invalidation

import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { CacheEntry, ContextDoc } from '../types.js'

/**
 * Get cache directory path for a repo
 */
function getCacheDir(repoPath: string): string {
  return join(repoPath, '.agentbrain')
}

/**
 * Get cache file path for a repo
 */
function getCacheFilePath(repoPath: string): string {
  return join(getCacheDir(repoPath), 'cache.json')
}

/**
 * Load cache entry for a repo
 */
export async function loadCache(repoPath: string): Promise<CacheEntry | null> {
  const cachePath = getCacheFilePath(repoPath)

  if (!existsSync(cachePath)) {
    return null
  }

  try {
    const content = await readFile(cachePath, 'utf-8')
    const cache: CacheEntry = JSON.parse(content)
    return cache
  } catch {
    // Invalid cache file
    return null
  }
}

/**
 * Save cache entry for a repo
 */
export async function saveCache(repoPath: string, cache: CacheEntry): Promise<void> {
  const cacheDir = getCacheDir(repoPath)
  const cachePath = getCacheFilePath(repoPath)

  // Ensure cache directory exists
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true })
  }

  await writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8')

  // Also ensure .gitignore includes .agentbrain
  await ensureGitignore(repoPath)
}

/**
 * Check if cache is valid for current git hash
 */
export async function isCacheValid(repoPath: string, currentGitHash: string): Promise<boolean> {
  const cache = await loadCache(repoPath)

  if (!cache) {
    return false
  }

  return cache.gitHash === currentGitHash
}

/**
 * Get cached doc by type if valid
 */
export async function getCachedDoc(
  repoPath: string,
  currentGitHash: string,
  type: ContextDoc['type']
): Promise<ContextDoc | null> {
  const isValid = await isCacheValid(repoPath, currentGitHash)

  if (!isValid) {
    return null
  }

  const cache = await loadCache(repoPath)
  return cache?.docs[type] || null
}

/**
 * Save a doc to cache
 */
export async function saveCachedDoc(
  repoPath: string,
  gitHash: string,
  doc: ContextDoc
): Promise<void> {
  let cache = await loadCache(repoPath)

  if (!cache || cache.gitHash !== gitHash) {
    // Create new cache entry
    cache = {
      gitHash,
      docs: {},
      savedAt: new Date().toISOString(),
    }
  }

  cache.docs[doc.type] = doc
  cache.savedAt = new Date().toISOString()

  await saveCache(repoPath, cache)
}

/**
 * Invalidate entire cache (delete cache file)
 */
export async function invalidateCache(repoPath: string): Promise<void> {
  const cachePath = getCacheFilePath(repoPath)

  if (existsSync(cachePath)) {
    const { unlink } = await import('node:fs/promises')
    await unlink(cachePath)
  }
}

/**
 * Ensure .gitignore includes .agentbrain/ and agentbrain/
 */
async function ensureGitignore(repoPath: string): Promise<void> {
  const gitignorePath = join(repoPath, '.gitignore')
  const patterns = ['.agentbrain/', 'agentbrain/']

  let content = ''
  let needsUpdate = false

  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, 'utf-8')

    // Check if patterns already exist
    for (const pattern of patterns) {
      if (!content.includes(pattern)) {
        needsUpdate = true
        break
      }
    }
  } else {
    needsUpdate = true
  }

  if (needsUpdate) {
    const lines: string[] = content ? content.split('\n') : []

    // Add comment and patterns if not present
    if (!content.includes('.agentbrain')) {
      lines.push('', '# AgentBrain cache', '.agentbrain/', 'agentbrain/')
    }

    await writeFile(gitignorePath, lines.join('\n'), 'utf-8')
  }
}
