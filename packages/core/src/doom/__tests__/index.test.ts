import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

describe('doom module exports', () => {
  it('exports analyzeDoomLoop function', async () => {
    const module = await import('../index.js')
    expect(module.analyzeDoomLoop).toBeDefined()
    expect(typeof module.analyzeDoomLoop).toBe('function')
  })

  it('exports DoomFile type', async () => {
    const module = await import('../index.js')
    expect(module).toBeDefined()
  })

  it('exports DoomLoopResult type', async () => {
    const module = await import('../index.js')
    expect(module).toBeDefined()
  })
})

describe('analyzeDoomLoop integration', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-doom-test-'))
    // Initialize git repo
    await execAsync('git init', { cwd: testDir })
    await execAsync('git config user.email "test@test.com"', { cwd: testDir })
    await execAsync('git config user.name "Test User"', { cwd: testDir })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns valid DoomLoopResult structure', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Create a file and commit it
    await writeFile(join(testDir, 'test.ts'), 'console.log("test")')
    await execAsync('git add .', { cwd: testDir })
    await execAsync('git commit -m "test commit"', { cwd: testDir })

    const result = await analyzeDoomLoop(testDir)

    expect(result).toHaveProperty('detected')
    expect(result).toHaveProperty('commitsAnalyzed')
    expect(result).toHaveProperty('files')
    expect(typeof result.detected).toBe('boolean')
    expect(typeof result.commitsAnalyzed).toBe('number')
    expect(Array.isArray(result.files)).toBe(true)
  })

  it('detects no doom loop with few commits', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Create a file and commit it once
    await writeFile(join(testDir, 'test.ts'), 'console.log("test")')
    await execAsync('git add .', { cwd: testDir })
    await execAsync('git commit -m "test commit"', { cwd: testDir })

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(false)
    expect(result.files).toHaveLength(0)
  })

  it('detects doom loop when file modified 4+ times', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    const testFile = join(testDir, 'test.ts')

    // Create and commit the same file 4 times
    for (let i = 1; i <= 4; i++) {
      await writeFile(testFile, `console.log("test ${i}")`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(true)
    expect(result.files.length).toBeGreaterThan(0)
    expect(result.files[0].path).toBe('test.ts')
    expect(result.files[0].commitCount).toBe(4)
    expect(result.files[0].percentage).toBe(40) // 4 out of 10 commits
  })

  it('excludes lock files from detection', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Commit package-lock.json 5 times (should be excluded)
    for (let i = 1; i <= 5; i++) {
      await writeFile(join(testDir, 'package-lock.json'), `{"version": "${i}"}`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(false)
    expect(result.files).toHaveLength(0)
  })

  it('excludes markdown files from detection', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Commit README.md 5 times (should be excluded)
    for (let i = 1; i <= 5; i++) {
      await writeFile(join(testDir, 'README.md'), `# Test ${i}`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(false)
    expect(result.files).toHaveLength(0)
  })

  it('excludes .agentbrain directory from detection', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    await mkdir(join(testDir, '.agentbrain'))

    // Commit .agentbrain/context.md 5 times (should be excluded)
    for (let i = 1; i <= 5; i++) {
      await writeFile(join(testDir, '.agentbrain', 'context.md'), `# Context ${i}`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(false)
    expect(result.files).toHaveLength(0)
  })

  it('sorts files by commit count descending', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // File A: 6 commits
    for (let i = 1; i <= 6; i++) {
      await writeFile(join(testDir, 'fileA.ts'), `console.log("A ${i}")`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "A commit ${i}"`, { cwd: testDir })
    }

    // File B: 4 commits
    for (let i = 1; i <= 4; i++) {
      await writeFile(join(testDir, 'fileB.ts'), `console.log("B ${i}")`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "B commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.detected).toBe(true)
    expect(result.files.length).toBe(2)
    expect(result.files[0].path).toBe('fileA.ts')
    expect(result.files[0].commitCount).toBe(6)
    expect(result.files[1].path).toBe('fileB.ts')
    expect(result.files[1].commitCount).toBe(4)
  })

  it('respects custom threshold parameter', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Commit file 3 times
    for (let i = 1; i <= 3; i++) {
      await writeFile(join(testDir, 'test.ts'), `console.log("test ${i}")`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    // With threshold=4, should not detect
    const result1 = await analyzeDoomLoop(testDir, 10, 4)
    expect(result1.detected).toBe(false)

    // With threshold=3, should detect
    const result2 = await analyzeDoomLoop(testDir, 10, 3)
    expect(result2.detected).toBe(true)
  })

  it('respects custom commit count parameter', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Commit file once
    await writeFile(join(testDir, 'test.ts'), 'console.log("test")')
    await execAsync('git add .', { cwd: testDir })
    await execAsync('git commit -m "commit"', { cwd: testDir })

    const result = await analyzeDoomLoop(testDir, 5, 4)

    expect(result.commitsAnalyzed).toBe(5)
  })

  it('throws error for non-git directory', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    const nonGitDir = await mkdtemp(join(tmpdir(), 'agentbrain-doom-non-git-'))

    try {
      await expect(analyzeDoomLoop(nonGitDir, 10, 4)).rejects.toThrow('Not a git repository')
    } finally {
      await rm(nonGitDir, { recursive: true, force: true })
    }
  })

  it('calculates percentage correctly', async () => {
    const { analyzeDoomLoop } = await import('../index.js')

    // Commit file 5 times out of 10 commits
    for (let i = 1; i <= 5; i++) {
      await writeFile(join(testDir, 'test.ts'), `console.log("test ${i}")`)
      await execAsync('git add .', { cwd: testDir })
      await execAsync(`git commit -m "commit ${i}"`, { cwd: testDir })
    }

    const result = await analyzeDoomLoop(testDir, 10, 4)

    expect(result.files[0].percentage).toBe(50) // 5 out of 10 = 50%
  })
})
