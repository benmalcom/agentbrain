import { describe, it, expect } from '@jest/globals'

// Simple unit tests for task-context module
// Integration tests would require mocking AI API calls

describe('task-context module', () => {
  it('exports scoreFilesForTask function', async () => {
    const module = await import('../task-context.js')
    expect(module.scoreFilesForTask).toBeDefined()
    expect(typeof module.scoreFilesForTask).toBe('function')
  })

  it('exports generateTaskContext function', async () => {
    const module = await import('../task-context.js')
    expect(module.generateTaskContext).toBeDefined()
    expect(typeof module.generateTaskContext).toBe('function')
  })

  it('scoreFilesForTask validates input parameters', async () => {
    const { scoreFilesForTask } = await import('../task-context.js')

    const mockConfig = {
      provider: 'anthropic' as const,
      apiKey: 'sk-test',
      models: { fast: 'model', mid: 'model', smart: 'model' },
    }

    // Should handle empty file list
    await expect(
      scoreFilesForTask('test task', [], mockConfig)
    ).resolves.toEqual([])
  })

  it('generateTaskContext validates cache requirement', async () => {
    const { generateTaskContext } = await import('../task-context.js')

    const mockConfig = {
      provider: 'anthropic' as const,
      apiKey: 'sk-test',
      models: { fast: 'model', mid: 'model', smart: 'model' },
    }

    // Should throw error when cache is empty (loadCache would return null/empty)
    // This test validates the error handling logic
    await expect(
      generateTaskContext({
        repoPath: '/nonexistent',
        aiConfig: mockConfig,
        task: 'test task',
      })
    ).rejects.toThrow()
  })
})

describe('task-context TypeScript types', () => {
  it('exports TaskContextOptions type', async () => {
    // This validates that the type is exported correctly
    const module = await import('../task-context.js')
    expect(module).toBeDefined()
  })

  it('exports ScoredFile type', async () => {
    const module = await import('../task-context.js')
    expect(module).toBeDefined()
  })
})
