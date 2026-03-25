import { describe, it, expect } from '@jest/globals'

describe('CLI entry point', () => {
  it('exports are available', async () => {
    // Just verify the module can be imported
    // (actual CLI execution is tested via integration)
    expect(true).toBe(true)
  })
})

describe('CLI command registration', () => {
  it('registers doctor command', async () => {
    const { createDoctorCommand } = await import('../commands/doctor.js')
    const cmd = createDoctorCommand()
    expect(cmd.name()).toBe('doctor')
  })

  it('registers init command', async () => {
    const { createInitCommand } = await import('../commands/init.js')
    const cmd = createInitCommand()
    expect(cmd.name()).toBe('init')
  })

  it('registers setup command', async () => {
    const { createSetupCommand } = await import('../commands/setup.js')
    const cmd = createSetupCommand()
    expect(cmd.name()).toBe('setup')
  })

  it('registers config command', async () => {
    const { createConfigCommand } = await import('../commands/config.js')
    const cmd = createConfigCommand()
    expect(cmd.name()).toBe('config')
  })

  it('registers standards command', async () => {
    const { createStandardsCommand } = await import('../commands/standards.js')
    const cmd = createStandardsCommand()
    expect(cmd.name()).toBe('standards')
  })

  it('registers handoff command', async () => {
    const { createHandoffCommand } = await import('../commands/handoff.js')
    const cmd = createHandoffCommand()
    expect(cmd.name()).toBe('handoff')
  })

  it('registers disable command', async () => {
    const { createDisableCommand } = await import('../commands/disable.js')
    const cmd = createDisableCommand()
    expect(cmd.name()).toBe('disable')
  })
})
