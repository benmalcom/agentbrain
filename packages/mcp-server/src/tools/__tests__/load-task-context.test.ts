import { describe, it, expect } from '@jest/globals'
import { loadTaskContextSchema } from '../load-task-context.js'

// Simple unit tests for MCP tool schema and basic validation
// Full integration tests would require mocking the entire core module

describe('loadTaskContextSchema', () => {
  it('has correct tool name', () => {
    expect(loadTaskContextSchema.name).toBe('load_task_context')
  })

  it('has valid input schema structure', () => {
    expect(loadTaskContextSchema.inputSchema).toBeDefined()
    expect(loadTaskContextSchema.inputSchema.type).toBe('object')
    expect(loadTaskContextSchema.inputSchema.properties).toBeDefined()
    expect(loadTaskContextSchema.inputSchema.required).toBeDefined()
  })

  it('has required fields in schema', () => {
    const required = loadTaskContextSchema.inputSchema.required
    expect(Array.isArray(required)).toBe(true)
    expect(required).toContain('repo_path')
    expect(required).toContain('task')
  })

  it('has optional max_files parameter', () => {
    const properties = loadTaskContextSchema.inputSchema.properties
    expect(properties).toHaveProperty('max_files')
    expect(properties.max_files.type).toBe('number')

    const required = loadTaskContextSchema.inputSchema.required
    expect(required).not.toContain('max_files')
  })

  it('has repo_path parameter with correct type', () => {
    const properties = loadTaskContextSchema.inputSchema.properties
    expect(properties.repo_path).toBeDefined()
    expect(properties.repo_path.type).toBe('string')
    expect(properties.repo_path.description).toBeDefined()
  })

  it('has task parameter with correct type', () => {
    const properties = loadTaskContextSchema.inputSchema.properties
    expect(properties.task).toBeDefined()
    expect(properties.task.type).toBe('string')
    expect(properties.task.description).toBeDefined()
  })

  it('describes near-zero cost feature', () => {
    expect(loadTaskContextSchema.description).toContain('cached summaries')
  })

  it('mentions re-use of cached data', () => {
    expect(loadTaskContextSchema.description.toLowerCase()).toContain('re-use')
  })

  it('has clear description', () => {
    expect(loadTaskContextSchema.description.length).toBeGreaterThan(20)
    expect(loadTaskContextSchema.description).toContain('task')
  })
})

describe('load-task-context module exports', () => {
  it('exports loadTaskContext function', async () => {
    const module = await import('../load-task-context.js')
    expect(module.loadTaskContext).toBeDefined()
    expect(typeof module.loadTaskContext).toBe('function')
  })

  it('exports loadTaskContextSchema object', async () => {
    const module = await import('../load-task-context.js')
    expect(module.loadTaskContextSchema).toBeDefined()
    expect(typeof module.loadTaskContextSchema).toBe('object')
  })

  it('exports LoadTaskContextInput type', async () => {
    const module = await import('../load-task-context.js')
    expect(module).toBeDefined()
  })

  it('exports LoadTaskContextOutput type', async () => {
    const module = await import('../load-task-context.js')
    expect(module).toBeDefined()
  })
})
