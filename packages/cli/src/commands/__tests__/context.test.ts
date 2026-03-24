import { describe, it, expect } from '@jest/globals'
import { createContextCommand } from '../context.js'

describe('context command', () => {
  it('exports createContextCommand function', () => {
    expect(createContextCommand).toBeDefined()
    expect(typeof createContextCommand).toBe('function')
  })

  it('creates command with correct name', () => {
    const cmd = createContextCommand()
    expect(cmd.name()).toBe('context')
  })

  it('has description', () => {
    const cmd = createContextCommand()
    expect(cmd.description()).toContain('task')
    expect(cmd.description().length).toBeGreaterThan(10)
  })

  it('has required task argument', () => {
    const cmd = createContextCommand()
    const args = cmd.registeredArguments
    expect(args.length).toBeGreaterThan(0)
    expect(args[0].name()).toBe('task')
    expect(args[0].required).toBe(true)
  })

  it('has --path option', () => {
    const cmd = createContextCommand()
    const pathOpt = cmd.options.find((o) => o.long === '--path')
    expect(pathOpt).toBeDefined()
    expect(pathOpt?.description).toContain('path')
  })

  it('has --max-files option with default', () => {
    const cmd = createContextCommand()
    const maxFilesOpt = cmd.options.find((o) => o.long === '--max-files')
    expect(maxFilesOpt).toBeDefined()
    expect(maxFilesOpt?.defaultValue).toBe('20')
  })

  it('has --output option with default', () => {
    const cmd = createContextCommand()
    const outputOpt = cmd.options.find((o) => o.long === '--output')
    expect(outputOpt).toBeDefined()
    expect(outputOpt?.defaultValue).toBe('agentbrain/task-context.md')
  })

  it('has --no-cache option', () => {
    const cmd = createContextCommand()
    const cacheOpt = cmd.options.find((o) => o.long === '--no-cache')
    expect(cacheOpt).toBeDefined()
    expect(cacheOpt?.description).toContain('cache')
  })

  it('has action handler', () => {
    const cmd = createContextCommand()
    // Commander stores action in _actionHandler
    expect((cmd as any)._actionHandler).toBeDefined()
  })
})
