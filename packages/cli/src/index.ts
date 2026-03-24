#!/usr/bin/env node

// AgentBrain CLI entry point

import { Command } from 'commander'
import { createConfigCommand } from './commands/config.js'
import { createInitCommand } from './commands/init.js'
import { createStandardsCommand } from './commands/standards.js'
import { createHandoffCommand } from './commands/handoff.js'
import { createSetupCommand } from './commands/setup.js'
import { createDisableCommand } from './commands/disable.js'
import { createContextCommand } from './commands/context.js'
import { createDoctorCommand } from './commands/doctor.js'

const program = new Command()

program
  .name('agentbrain')
  .description('Generate smart context docs for coding agents')
  .version('1.4.9')

// Add commands
program.addCommand(createSetupCommand())
program.addCommand(createInitCommand())
program.addCommand(createContextCommand())
program.addCommand(createStandardsCommand())
program.addCommand(createHandoffCommand())
program.addCommand(createDoctorCommand())
program.addCommand(createConfigCommand())
program.addCommand(createDisableCommand())

// Parse arguments
program.parse()
// Clean test
