import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('spec module exports', () => {
  it('exports saveSpec function', async () => {
    const module = await import('../index.js')
    expect(module.saveSpec).toBeDefined()
    expect(typeof module.saveSpec).toBe('function')
  })

  it('exports loadSpec function', async () => {
    const module = await import('../index.js')
    expect(module.loadSpec).toBeDefined()
    expect(typeof module.loadSpec).toBe('function')
  })

  it('exports listSpecs function', async () => {
    const module = await import('../index.js')
    expect(module.listSpecs).toBeDefined()
    expect(typeof module.listSpecs).toBe('function')
  })

  it('exports injectSpecReference function', async () => {
    const module = await import('../index.js')
    expect(module.injectSpecReference).toBeDefined()
    expect(typeof module.injectSpecReference).toBe('function')
  })
})

describe('saveSpec', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-spec-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('creates specs directory if it does not exist', async () => {
    const { saveSpec } = await import('../index.js')

    const filePath = await saveSpec(testDir, 'test-spec', '# Test Spec')

    expect(existsSync(join(testDir, '.agentbrain', 'specs'))).toBe(true)
    expect(filePath).toBe(join(testDir, '.agentbrain', 'specs', 'test-spec.md'))
  })

  it('saves spec file with correct content', async () => {
    const { saveSpec } = await import('../index.js')

    const content = '# Test Spec\n\nThis is a test spec.'
    const filePath = await saveSpec(testDir, 'test-spec', content)

    const savedContent = await readFile(filePath, 'utf-8')
    expect(savedContent).toBe(content)
  })

  it('overwrites existing spec file', async () => {
    const { saveSpec } = await import('../index.js')

    await mkdir(join(testDir, '.agentbrain', 'specs'), { recursive: true })
    await writeFile(join(testDir, '.agentbrain', 'specs', 'test-spec.md'), 'old content')

    const newContent = 'new content'
    await saveSpec(testDir, 'test-spec', newContent)

    const savedContent = await readFile(
      join(testDir, '.agentbrain', 'specs', 'test-spec.md'),
      'utf-8'
    )
    expect(savedContent).toBe(newContent)
  })
})

describe('loadSpec', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-spec-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns spec content when file exists', async () => {
    const { loadSpec, saveSpec } = await import('../index.js')

    const content = '# Test Spec'
    await saveSpec(testDir, 'test-spec', content)

    const loadedContent = await loadSpec(testDir, 'test-spec')

    expect(loadedContent).toBe(content)
  })

  it('returns null when spec file does not exist', async () => {
    const { loadSpec } = await import('../index.js')

    const loadedContent = await loadSpec(testDir, 'non-existent')

    expect(loadedContent).toBeNull()
  })
})

describe('listSpecs', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-spec-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('returns empty array when specs directory does not exist', async () => {
    const { listSpecs } = await import('../index.js')

    const specs = await listSpecs(testDir)

    expect(specs).toEqual([])
  })

  it('returns empty array when specs directory is empty', async () => {
    const { listSpecs } = await import('../index.js')

    await mkdir(join(testDir, '.agentbrain', 'specs'), { recursive: true })

    const specs = await listSpecs(testDir)

    expect(specs).toEqual([])
  })

  it('returns list of spec slugs', async () => {
    const { listSpecs, saveSpec } = await import('../index.js')

    await saveSpec(testDir, 'spec-one', '# Spec One')
    await saveSpec(testDir, 'spec-two', '# Spec Two')
    await saveSpec(testDir, 'spec-three', '# Spec Three')

    const specs = await listSpecs(testDir)

    expect(specs).toHaveLength(3)
    expect(specs).toContain('spec-one')
    expect(specs).toContain('spec-two')
    expect(specs).toContain('spec-three')
  })

  it('only returns .md files', async () => {
    const { listSpecs } = await import('../index.js')

    await mkdir(join(testDir, '.agentbrain', 'specs'), { recursive: true })
    await writeFile(join(testDir, '.agentbrain', 'specs', 'spec-one.md'), '# Spec')
    await writeFile(join(testDir, '.agentbrain', 'specs', 'readme.txt'), 'text')
    await writeFile(join(testDir, '.agentbrain', 'specs', 'notes.json'), '{}')

    const specs = await listSpecs(testDir)

    expect(specs).toEqual(['spec-one'])
  })
})

describe('injectSpecReference', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-spec-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('injects spec reference into CLAUDE.md', async () => {
    const { injectSpecReference } = await import('../index.js')

    const claudePath = join(testDir, 'CLAUDE.md')
    await writeFile(claudePath, '# Claude Rules\n\nExisting content.')

    await injectSpecReference(testDir, 'test-spec')

    const content = await readFile(claudePath, 'utf-8')

    expect(content).toContain('**Active Spec:** Read `.agentbrain/specs/test-spec.md`')
  })

  it('does not inject duplicate references', async () => {
    const { injectSpecReference } = await import('../index.js')

    const claudePath = join(testDir, 'CLAUDE.md')
    await writeFile(claudePath, '# Claude Rules')

    await injectSpecReference(testDir, 'test-spec')
    await injectSpecReference(testDir, 'test-spec') // Call twice

    const content = await readFile(claudePath, 'utf-8')

    const matches = content.match(/\*\*Active Spec:\*\*/g)
    expect(matches).toHaveLength(1)
  })

  it('handles missing agent files gracefully', async () => {
    const { injectSpecReference } = await import('../index.js')

    // Don't create any agent files
    await expect(injectSpecReference(testDir, 'test-spec')).resolves.not.toThrow()
  })

  it('adds proper separator when file does not end with newline', async () => {
    const { injectSpecReference } = await import('../index.js')

    const claudePath = join(testDir, 'CLAUDE.md')
    await writeFile(claudePath, 'Content without newline')

    await injectSpecReference(testDir, 'test-spec')

    const content = await readFile(claudePath, 'utf-8')

    expect(content).toMatch(/Content without newline\n\n---/)
  })

  it('uses single separator when file already ends with newline', async () => {
    const { injectSpecReference } = await import('../index.js')

    const claudePath = join(testDir, 'CLAUDE.md')
    await writeFile(claudePath, 'Content with newline\n')

    await injectSpecReference(testDir, 'test-spec')

    const content = await readFile(claudePath, 'utf-8')

    expect(content).toMatch(/Content with newline\n\n---/)
    expect(content).not.toMatch(/\n\n\n/)
  })
})
