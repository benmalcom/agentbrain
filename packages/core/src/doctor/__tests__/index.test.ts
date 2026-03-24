import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, writeFile, mkdir, chmod } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Simple integration tests for doctor module
// These test the actual diagnostic logic without mocking dependencies

describe('doctor module', () => {
  it('exports runDiagnostics function', async () => {
    const module = await import('../index.js')
    expect(module.runDiagnostics).toBeDefined()
    expect(typeof module.runDiagnostics).toBe('function')
  })

  it('exports DoctorCheck type', async () => {
    const module = await import('../index.js')
    expect(module).toBeDefined()
  })

  it('exports DoctorResult type', async () => {
    const module = await import('../index.js')
    expect(module).toBeDefined()
  })
})

describe('runDiagnostics integration', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-doctor-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns valid DoctorResult structure', async () => {
    const { runDiagnostics } = await import('../index.js')

    // Create minimal test environment
    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    // Validate structure
    expect(result).toHaveProperty('checks')
    expect(result).toHaveProperty('score')
    expect(Array.isArray(result.checks)).toBe(true)
    expect(result.score).toHaveProperty('passed')
    expect(result.score).toHaveProperty('total')
    expect(typeof result.score.passed).toBe('number')
    expect(typeof result.score.total).toBe('number')
  })

  it('each check has required properties', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    for (const check of result.checks) {
      expect(check).toHaveProperty('name')
      expect(check).toHaveProperty('status')
      expect(check).toHaveProperty('message')
      expect(typeof check.name).toBe('string')
      expect(['pass', 'warn', 'fail']).toContain(check.status)
      expect(typeof check.message).toBe('string')

      // fix property is optional
      if (check.fix) {
        expect(typeof check.fix).toBe('string')
      }
    }
  })

  it('detects git repository correctly', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    const gitCheck = result.checks.find((c) => c.name === 'git_repository')
    expect(gitCheck).toBeDefined()
    expect(gitCheck?.status).toBe('pass')
  })

  it('detects missing git repository', async () => {
    const { runDiagnostics } = await import('../index.js')

    // Don't create .git directory

    const result = await runDiagnostics(testDir)

    const gitCheck = result.checks.find((c) => c.name === 'git_repository')
    expect(gitCheck).toBeDefined()
    expect(gitCheck?.status).toBe('fail')
    expect(gitCheck?.fix).toBe('git init')
  })

  it('detects missing context files', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    const contextCheck = result.checks.find((c) => c.name === 'context_files')
    expect(contextCheck).toBeDefined()
    expect(contextCheck?.status).toBe('fail')
    expect(contextCheck?.message).toContain('no context files found')
  })

  it('detects present context files', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))
    await mkdir(join(testDir, 'agentbrain'), { recursive: true })
    await writeFile(join(testDir, 'agentbrain', 'context.md'), '# Context')
    await writeFile(join(testDir, 'agentbrain', 'dependency-map.md'), '# Deps')
    await writeFile(join(testDir, 'agentbrain', 'patterns.md'), '# Patterns')

    const result = await runDiagnostics(testDir)

    const contextCheck = result.checks.find((c) => c.name === 'context_files')
    expect(contextCheck).toBeDefined()
    expect(contextCheck?.status).toBe('pass')
  })

  it('detects missing git hook', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git', 'hooks'), { recursive: true })

    const result = await runDiagnostics(testDir)

    const hookCheck = result.checks.find((c) => c.name === 'git_hook')
    expect(hookCheck).toBeDefined()
    expect(hookCheck?.status).toBe('fail')
    expect(hookCheck?.message).toContain('missing')
  })

  it('detects present git hook', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git', 'hooks'), { recursive: true })
    const hookPath = join(testDir, '.git', 'hooks', 'post-commit')
    await writeFile(hookPath, '#!/bin/sh\n# AgentBrain auto-update\necho "test"')
    await chmod(hookPath, 0o755)

    const result = await runDiagnostics(testDir)

    const hookCheck = result.checks.find((c) => c.name === 'git_hook')
    expect(hookCheck).toBeDefined()
    expect(hookCheck?.status).toBe('pass')
  })

  it('warns about non-executable hook', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git', 'hooks'), { recursive: true })
    const hookPath = join(testDir, '.git', 'hooks', 'post-commit')
    await writeFile(hookPath, '#!/bin/sh\n# AgentBrain\necho "test"')
    await chmod(hookPath, 0o644) // Not executable

    const result = await runDiagnostics(testDir)

    const hookCheck = result.checks.find((c) => c.name === 'git_hook')
    expect(hookCheck).toBeDefined()
    expect(hookCheck?.status).toBe('warn')
    expect(hookCheck?.message).toContain('not executable')
  })

  it('score calculation is correct', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    expect(result.score.passed).toBeLessThanOrEqual(result.score.total)
    expect(result.score.passed).toBeGreaterThanOrEqual(0)
    expect(result.score.total).toBeGreaterThan(0)

    // Verify score matches actual passed checks
    const actualPassed = result.checks.filter((c) => c.status === 'pass').length
    expect(result.score.passed).toBe(actualPassed)
    expect(result.score.total).toBe(result.checks.length)
  })

  it('includes checks for all key components', async () => {
    const { runDiagnostics } = await import('../index.js')

    await mkdir(join(testDir, '.git'))

    const result = await runDiagnostics(testDir)

    const checkNames = result.checks.map((c) => c.name)

    // Verify all essential checks are present
    expect(checkNames).toContain('api_key')
    expect(checkNames).toContain('git_repository')
    expect(checkNames).toContain('context_files')
    expect(checkNames).toContain('cache_valid')
    expect(checkNames).toContain('git_hook')
    expect(checkNames).toContain('context_freshness')
    expect(checkNames).toContain('file_scan_sanity')
  })
})
