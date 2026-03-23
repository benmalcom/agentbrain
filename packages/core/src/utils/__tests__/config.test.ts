import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadAPIKey, detectProvider, getDefaultModels } from '../config.js'

describe('detectProvider', () => {
  it('detects Anthropic from sk-ant- prefix', () => {
    expect(detectProvider('sk-ant-api03-test123')).toBe('anthropic')
  })

  it('detects OpenAI from sk- prefix', () => {
    expect(detectProvider('sk-proj-test123')).toBe('openai')
    expect(detectProvider('sk-test123')).toBe('openai')
  })

  it('throws error for invalid key format', () => {
    expect(() => detectProvider('invalid-key')).toThrow()
    expect(() => detectProvider('api-key-123')).toThrow()
  })
})

describe('getDefaultModels', () => {
  it('returns correct Anthropic models', () => {
    const models = getDefaultModels('anthropic')
    expect(models.fast).toBe('claude-haiku-4-5-20251001')
    expect(models.mid).toBe('claude-sonnet-4-6')
    expect(models.smart).toBe('claude-opus-4-6')
  })

  it('returns correct OpenAI models', () => {
    const models = getDefaultModels('openai')
    expect(models.fast).toBe('gpt-4o-mini')
    expect(models.mid).toBe('gpt-4o')
    expect(models.smart).toBe('gpt-4.1')
  })
})

describe('loadAPIKey', () => {
  let testDir: string
  let originalEnv: NodeJS.ProcessEnv
  let originalCwd: string

  beforeEach(async () => {
    // Save original state
    originalEnv = { ...process.env }
    originalCwd = process.cwd()

    // Create test directory
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-config-test-'))

    // Clear environment variables
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY

    // Change to test directory
    process.chdir(testDir)
  })

  afterEach(async () => {
    // Restore original state
    process.env = originalEnv
    process.chdir(originalCwd)

    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('loads from ANTHROPIC_API_KEY environment variable', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test123'

    const result = await loadAPIKey()
    expect(result).toEqual({
      apiKey: 'sk-ant-test123',
      provider: 'anthropic',
    })
  })

  it('loads from OPENAI_API_KEY environment variable', async () => {
    process.env.OPENAI_API_KEY = 'sk-test123'

    const result = await loadAPIKey()
    expect(result).toEqual({
      apiKey: 'sk-test123',
      provider: 'openai',
    })
  })

  it('prefers ANTHROPIC_API_KEY over OPENAI_API_KEY', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test123'
    process.env.OPENAI_API_KEY = 'sk-test456'

    const result = await loadAPIKey()
    expect(result?.provider).toBe('anthropic')
  })

  it('loads from .env file in current directory', async () => {
    await writeFile(
      join(testDir, '.env'),
      'ANTHROPIC_API_KEY=sk-ant-from-env\n'
    )

    const result = await loadAPIKey()
    expect(result).toEqual({
      apiKey: 'sk-ant-from-env',
      provider: 'anthropic',
    })
  })

  it('loads from .env.local file in current directory', async () => {
    await writeFile(
      join(testDir, '.env.local'),
      'OPENAI_API_KEY=sk-from-env-local\n'
    )

    const result = await loadAPIKey()
    expect(result).toEqual({
      apiKey: 'sk-from-env-local',
      provider: 'openai',
    })
  })

  it('prefers .env.local over .env', async () => {
    await writeFile(join(testDir, '.env'), 'ANTHROPIC_API_KEY=sk-ant-env\n')
    await writeFile(
      join(testDir, '.env.local'),
      'ANTHROPIC_API_KEY=sk-ant-env-local\n'
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-env-local')
  })

  it('handles .env file with quoted values', async () => {
    await writeFile(
      join(testDir, '.env'),
      'ANTHROPIC_API_KEY="sk-ant-quoted"\n'
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-quoted')
  })

  it('handles .env file with single quotes', async () => {
    await writeFile(
      join(testDir, '.env'),
      "OPENAI_API_KEY='sk-single-quoted'\n"
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-single-quoted')
  })

  it('handles .env file with comments', async () => {
    await writeFile(
      join(testDir, '.env'),
      '# This is a comment\nANTHROPIC_API_KEY=sk-ant-test\n# Another comment\n'
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-test')
  })

  it('handles .env file with empty lines', async () => {
    await writeFile(
      join(testDir, '.env'),
      '\n\nANTHROPIC_API_KEY=sk-ant-test\n\n'
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-test')
  })

  it('loads from git root .env when in subdirectory', async () => {
    // Create fake git root
    const gitDir = join(testDir, '.git')
    await mkdir(gitDir)

    // Create .env in git root
    await writeFile(
      join(testDir, '.env'),
      'ANTHROPIC_API_KEY=sk-ant-git-root\n'
    )

    // Create subdirectory and change to it
    const subDir = join(testDir, 'subdir')
    await mkdir(subDir)
    process.chdir(subDir)

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-git-root')
  })

  it('prefers current directory .env over git root', async () => {
    // Create fake git root
    const gitDir = join(testDir, '.git')
    await mkdir(gitDir)

    // Create .env in git root
    await writeFile(
      join(testDir, '.env'),
      'ANTHROPIC_API_KEY=sk-ant-git-root\n'
    )

    // Create subdirectory with its own .env
    const subDir = join(testDir, 'subdir')
    await mkdir(subDir)
    await writeFile(
      join(subDir, '.env'),
      'ANTHROPIC_API_KEY=sk-ant-subdir\n'
    )

    process.chdir(subDir)

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-subdir')
  })

  it('returns null when no API key found', async () => {
    const result = await loadAPIKey()
    expect(result).toBeNull()
  })

  it('ignores malformed .env lines', async () => {
    await writeFile(
      join(testDir, '.env'),
      'INVALID LINE\nANTHROPIC_API_KEY=sk-ant-valid\nANOTHER_INVALID\n'
    )

    const result = await loadAPIKey()
    expect(result?.apiKey).toBe('sk-ant-valid')
  })

  it('does not print to stdout when loading .env', async () => {
    await writeFile(
      join(testDir, '.env'),
      'ANTHROPIC_API_KEY=sk-ant-silent\n'
    )

    // Capture stdout
    const originalWrite = process.stdout.write
    let output = ''
    process.stdout.write = ((chunk: any) => {
      output += chunk.toString()
      return true
    }) as any

    try {
      await loadAPIKey()
      // Should be completely silent
      expect(output).toBe('')
    } finally {
      process.stdout.write = originalWrite
    }
  })
})
