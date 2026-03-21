#!/usr/bin/env node

// AgentBrain CLI entry point

import { Command } from 'commander'
import { createConfigCommand } from './commands/config.js'
import { createInitCommand } from './commands/init.js'
import { createStandardsCommand } from './commands/standards.js'
import { createHandoffCommand } from './commands/handoff.js'

const program = new Command()

program
  .name('agentbrain')
  .description('Generate smart context docs for coding agents')
  .version('1.0.0')

// Add commands
program.addCommand(createInitCommand())
program.addCommand(createStandardsCommand())
program.addCommand(createHandoffCommand())
program.addCommand(createConfigCommand())

// Parse arguments
program.parse()
