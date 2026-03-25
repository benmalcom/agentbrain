import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CacheEntry } from '../../types.js'

describe('cache module exports', () => {
  it('exports loadCache function', async () => {
    const module = await import('../index.js')
    expect(module.loadCache).toBeDefined()
    expect(typeof module.loadCache).toBe('function')
  })

  it('exports saveCache function', async () => {
    const module = await import('../index.js')
    expect(module.saveCache).toBeDefined()
    expect(typeof module.saveCache).toBe('function')
  })

  it('exports isCacheValid function', async () => {
    const module = await import('../index.js')
    expect(module.isCacheValid).toBeDefined()
    expect(typeof module.isCacheValid).toBe('function')
  })

  it('exports getCachedDoc function', async () => {
    const module = await import('../index.js')
    expect(module.getCachedDoc).toBeDefined()
    expect(typeof module.getCachedDoc).toBe('function')
  })

  it('exports saveCachedDoc function', async () => {
    const module = await import('../index.js')
    expect(module.saveCachedDoc).toBeDefined()
    expect(typeof module.saveCachedDoc).toBe('function')
  })

  it('exports invalidateCache function', async () => {
    const module = await import('../index.js')
    expect(module.invalidateCache).toBeDefined()
    expect(typeof module.invalidateCache).toBe('function')
  })
})

describe('saveCache atomic writes', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-cache-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('creates cache directory if it does not exist', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)

    expect(existsSync(join(testDir, '.agentbrain'))).toBe(true)
    expect(existsSync(join(testDir, '.agentbrain', 'cache.json'))).toBe(true)
  })

  it('writes cache file with correct content', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {
        context: {
          type: 'context',
          content: 'test context',
          generatedAt: '2025-01-01T00:00:00.000Z',
          gitHash: 'abc123',
          tokenCount: 100,
        },
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    }

    await saveCache(testDir, cache)

    const content = await readFile(join(testDir, '.agentbrain', 'cache.json'), 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed.gitHash).toBe('abc123')
    expect(parsed.docs.context.content).toBe('test context')
    expect(parsed.savedAt).toBe('2025-01-01T00:00:00.000Z')
  })

  it('uses atomic write (temp file + rename)', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)

    // Temp file should not exist after successful write
    expect(existsSync(join(testDir, '.agentbrain', 'cache.json.tmp'))).toBe(false)

    // Final file should exist
    expect(existsSync(join(testDir, '.agentbrain', 'cache.json'))).toBe(true)
  })

  it('formats JSON with proper indentation', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)

    const content = await readFile(join(testDir, '.agentbrain', 'cache.json'), 'utf-8')

    // Should have newlines and indentation
    expect(content).toContain('\n')
    expect(content).toContain('  ')
  })

  it('creates .gitignore with agentbrain patterns', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)

    expect(existsSync(join(testDir, '.gitignore'))).toBe(true)

    const gitignoreContent = await readFile(join(testDir, '.gitignore'), 'utf-8')
    expect(gitignoreContent).toContain('# AgentBrain cache')
    expect(gitignoreContent).toContain('.agentbrain/')
  })

  it('does not duplicate .gitignore entries', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    // Save twice
    await saveCache(testDir, cache)
    await saveCache(testDir, cache)

    const gitignoreContent = await readFile(join(testDir, '.gitignore'), 'utf-8')
    const matches = gitignoreContent.match(/# AgentBrain cache/g)
    expect(matches).toHaveLength(1)
  })

  it('uses atomic write for .gitignore', async () => {
    const { saveCache } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)

    // Temp file should not exist after successful write
    expect(existsSync(join(testDir, '.gitignore.tmp'))).toBe(false)

    // Final file should exist
    expect(existsSync(join(testDir, '.gitignore'))).toBe(true)
  })
})

describe('loadCache', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-cache-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns null when cache file does not exist', async () => {
    const { loadCache } = await import('../index.js')

    const cache = await loadCache(testDir)

    expect(cache).toBeNull()
  })

  it('loads valid cache file', async () => {
    const { saveCache, loadCache } = await import('../index.js')

    const originalCache: CacheEntry = {
      gitHash: 'abc123',
      docs: {
        context: {
          type: 'context',
          content: 'test content',
          generatedAt: '2025-01-01T00:00:00.000Z',
          gitHash: 'abc123',
          tokenCount: 100,
        },
      },
      savedAt: '2025-01-01T00:00:00.000Z',
    }

    await saveCache(testDir, originalCache)
    const loadedCache = await loadCache(testDir)

    expect(loadedCache).not.toBeNull()
    expect(loadedCache?.gitHash).toBe('abc123')
    expect(loadedCache?.docs.context?.content).toBe('test content')
  })

  it('returns null for invalid JSON', async () => {
    const { loadCache } = await import('../index.js')
    const { writeFile, mkdir } = await import('node:fs/promises')

    await mkdir(join(testDir, '.agentbrain'), { recursive: true })
    await writeFile(join(testDir, '.agentbrain', 'cache.json'), 'invalid json')

    const cache = await loadCache(testDir)

    expect(cache).toBeNull()
  })
})

describe('isCacheValid', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-cache-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns false when no cache exists', async () => {
    const { isCacheValid } = await import('../index.js')

    const valid = await isCacheValid(testDir, 'abc123')

    expect(valid).toBe(false)
  })

  it('returns true when git hash matches', async () => {
    const { saveCache, isCacheValid } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)
    const valid = await isCacheValid(testDir, 'abc123')

    expect(valid).toBe(true)
  })

  it('returns false when git hash does not match', async () => {
    const { saveCache, isCacheValid } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)
    const valid = await isCacheValid(testDir, 'different-hash')

    expect(valid).toBe(false)
  })
})

describe('getCachedDoc', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-cache-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns null when cache is invalid', async () => {
    const { getCachedDoc } = await import('../index.js')

    const doc = await getCachedDoc(testDir, 'abc123', 'context')

    expect(doc).toBeNull()
  })

  it('returns cached doc when hash matches', async () => {
    const { saveCache, getCachedDoc } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {
        context: {
          type: 'context',
          content: 'test context content',
          generatedAt: '2025-01-01T00:00:00.000Z',
          gitHash: 'abc123',
          tokenCount: 100,
        },
      },
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)
    const doc = await getCachedDoc(testDir, 'abc123', 'context')

    expect(doc).not.toBeNull()
    expect(doc?.content).toBe('test context content')
  })

  it('returns null when hash does not match', async () => {
    const { saveCache, getCachedDoc } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {
        context: {
          type: 'context',
          content: 'test context content',
          generatedAt: '2025-01-01T00:00:00.000Z',
          gitHash: 'abc123',
          tokenCount: 100,
        },
      },
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)
    const doc = await getCachedDoc(testDir, 'different-hash', 'context')

    expect(doc).toBeNull()
  })

  it('returns null when doc type not in cache', async () => {
    const { saveCache, getCachedDoc } = await import('../index.js')

    const cache: CacheEntry = {
      gitHash: 'abc123',
      docs: {},
      savedAt: new Date().toISOString(),
    }

    await saveCache(testDir, cache)
    const doc = await getCachedDoc(testDir, 'abc123', 'context')

    expect(doc).toBeNull()
  })
})
