import { describe, it, expect } from '@jest/globals'
import { createDoctorCommand } from '../doctor.js'

describe('doctor command', () => {
  it('exports createDoctorCommand function', () => {
    expect(createDoctorCommand).toBeDefined()
    expect(typeof createDoctorCommand).toBe('function')
  })

  it('creates command with correct name', () => {
    const cmd = createDoctorCommand()
    expect(cmd.name()).toBe('doctor')
  })

  it('has description', () => {
    const cmd = createDoctorCommand()
    expect(cmd.description()).toContain('diagnostic')
    expect(cmd.description().length).toBeGreaterThan(10)
  })

  it('has --path option', () => {
    const cmd = createDoctorCommand()
    const pathOpt = cmd.options.find((o) => o.long === '--path')
    expect(pathOpt).toBeDefined()
    expect(pathOpt?.description).toContain('path')
  })

  it('has --fix option', () => {
    const cmd = createDoctorCommand()
    const fixOpt = cmd.options.find((o) => o.long === '--fix')
    expect(fixOpt).toBeDefined()
    expect(fixOpt?.description).toContain('fix')
  })

  it('has --json option', () => {
    const cmd = createDoctorCommand()
    const jsonOpt = cmd.options.find((o) => o.long === '--json')
    expect(jsonOpt).toBeDefined()
    expect(jsonOpt?.description).toContain('JSON')
  })

  it('has no required arguments', () => {
    const cmd = createDoctorCommand()
    const requiredArgs = cmd.registeredArguments.filter((a) => a.required)
    expect(requiredArgs.length).toBe(0)
  })

  it('has action handler', () => {
    const cmd = createDoctorCommand()
    // Commander stores action in _actionHandler
    expect((cmd as any)._actionHandler).toBeDefined()
  })
})
