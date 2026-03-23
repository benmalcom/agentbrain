import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectAgents, injectIntoAgentFile } from '../index.js'

describe('detectAgents', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('detects Claude Code when CLAUDE.md exists', async () => {
    await writeFile(join(testDir, 'CLAUDE.md'), '# Test')

    const agents = detectAgents(testDir)
    expect(agents).toContain('claude-code')
  })

  it('detects Cursor when .cursorrules exists', async () => {
    await writeFile(join(testDir, '.cursorrules'), '# Test')

    const agents = detectAgents(testDir)
    expect(agents).toContain('cursor')
  })

  it('detects Cursor when legacy .cursor/rules exists', async () => {
    const cursorDir = join(testDir, '.cursor')
    await mkdir(cursorDir)
    await writeFile(join(cursorDir, 'rules'), '# Test')

    const agents = detectAgents(testDir)
    expect(agents).toContain('cursor')
  })

  it('detects Windsurf when .windsurfrules exists', async () => {
    await writeFile(join(testDir, '.windsurfrules'), '# Test')

    const agents = detectAgents(testDir)
    expect(agents).toContain('windsurf')
  })

  it('detects multiple agents', async () => {
    await writeFile(join(testDir, 'CLAUDE.md'), '# Test')
    await writeFile(join(testDir, '.cursorrules'), '# Test')
    await writeFile(join(testDir, '.windsurfrules'), '# Test')

    const agents = detectAgents(testDir)
    expect(agents).toHaveLength(3)
    expect(agents).toContain('claude-code')
    expect(agents).toContain('cursor')
    expect(agents).toContain('windsurf')
  })

  it('returns empty array when no agents detected', () => {
    const agents = detectAgents(testDir)
    expect(agents).toEqual([])
  })
})

describe('injectIntoAgentFile', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'agentbrain-test-'))
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('creates CLAUDE.md when it does not exist', async () => {
    const result = await injectIntoAgentFile(testDir, 'claude-code', 'test-hash-123')

    expect(result.created).toBe(true)
    expect(result.updated).toBe(false)

    const filePath = join(testDir, 'CLAUDE.md')
    expect(existsSync(filePath)).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toContain('AgentBrain Auto-Managed Section')
    // Git hash is truncated to 8 chars
    expect(content).toContain('test-has')
  })

  it('creates .cursorrules when it does not exist', async () => {
    const result = await injectIntoAgentFile(testDir, 'cursor', 'test-hash-456')

    expect(result.created).toBe(true)
    expect(result.updated).toBe(false)

    const filePath = join(testDir, '.cursorrules')
    expect(existsSync(filePath)).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toContain('AgentBrain Auto-Managed Section')
    // Git hash is truncated to 8 chars
    expect(content).toContain('test-has')
  })

  it('updates existing file instead of creating', async () => {
    const filePath = join(testDir, 'CLAUDE.md')
    await writeFile(filePath, '# My Project Rules\n\nSome existing content\n')

    const result = await injectIntoAgentFile(testDir, 'claude-code', 'hash-789')

    expect(result.created).toBe(false)
    expect(result.updated).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toContain('My Project Rules')
    expect(content).toContain('Some existing content')
    expect(content).toContain('AgentBrain Auto-Managed Section')
    expect(content).toContain('hash-789')
  })

  it('updates managed section when it already exists', async () => {
    const filePath = join(testDir, 'CLAUDE.md')
    const initialContent = `# My Rules

<!-- AgentBrain Auto-Managed Section -->
Old content here
Git: old-hash
<!-- End AgentBrain Section -->

More rules
`
    await writeFile(filePath, initialContent)

    const result = await injectIntoAgentFile(testDir, 'claude-code', 'new-hash')

    expect(result.created).toBe(false)
    expect(result.updated).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toContain('My Rules')
    expect(content).toContain('More rules')
    expect(content).toContain('new-hash')
    expect(content).not.toContain('old-hash')
    expect(content).not.toContain('Old content here')
  })

  it('preserves existing content when updating', async () => {
    const filePath = join(testDir, 'CLAUDE.md')
    await writeFile(filePath, '# Important\n\nDo not delete this\n')

    await injectIntoAgentFile(testDir, 'claude-code', 'hash-1')

    const content = await readFile(filePath, 'utf-8')
    expect(content).toContain('# Important')
    expect(content).toContain('Do not delete this')
  })

  it('uses legacy .cursor/rules if it exists and .cursorrules does not', async () => {
    const cursorDir = join(testDir, '.cursor')
    await mkdir(cursorDir)
    await writeFile(join(cursorDir, 'rules'), '# Legacy')

    const result = await injectIntoAgentFile(testDir, 'cursor', 'hash-legacy')

    expect(result.updated).toBe(true)

    const content = await readFile(join(cursorDir, 'rules'), 'utf-8')
    expect(content).toContain('# Legacy')
    expect(content).toContain('AgentBrain Auto-Managed Section')
  })

  it('prefers .cursorrules over legacy path when both exist', async () => {
    // Create both files
    const cursorDir = join(testDir, '.cursor')
    await mkdir(cursorDir)
    await writeFile(join(cursorDir, 'rules'), '# Legacy')
    await writeFile(join(testDir, '.cursorrules'), '# Modern')

    await injectIntoAgentFile(testDir, 'cursor', 'hash-modern')

    // Modern file should be updated
    const modernContent = await readFile(join(testDir, '.cursorrules'), 'utf-8')
    expect(modernContent).toContain('AgentBrain Auto-Managed Section')

    // Legacy file should be unchanged
    const legacyContent = await readFile(join(cursorDir, 'rules'), 'utf-8')
    expect(legacyContent).toBe('# Legacy')
  })

  it('includes MCP tool instructions for all agents', async () => {
    const claudeResult = await injectIntoAgentFile(testDir, 'claude-code', 'hash')
    const claudeContent = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8')
    expect(claudeContent).toContain('load_context')
    expect(claudeContent).toContain('MCP tool')

    const cursorResult = await injectIntoAgentFile(testDir, 'cursor', 'hash')
    const cursorContent = await readFile(join(testDir, '.cursorrules'), 'utf-8')
    expect(cursorContent).toContain('load_context')

    const windsurfResult = await injectIntoAgentFile(testDir, 'windsurf', 'hash')
    const windsurfContent = await readFile(join(testDir, '.windsurfrules'), 'utf-8')
    expect(windsurfContent).toContain('load_context')
  })

  it('includes fallback file paths', async () => {
    await injectIntoAgentFile(testDir, 'claude-code', 'hash')

    const content = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('agentbrain/context.md')
    expect(content).toContain('agentbrain/patterns.md')
    expect(content).toContain('agentbrain/dependency-map.md')
  })

  it('includes git hash in injected content', async () => {
    const gitHash = 'abc123def456'
    await injectIntoAgentFile(testDir, 'claude-code', gitHash)

    const content = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain(gitHash.substring(0, 8))
  })

  it('includes last updated date', async () => {
    await injectIntoAgentFile(testDir, 'claude-code', 'hash')

    const content = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8')
    const today = new Date().toISOString().split('T')[0]
    expect(content).toContain(today)
  })
})
