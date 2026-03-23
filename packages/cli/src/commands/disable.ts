// Disable/uninstall AgentBrain

import { Command } from 'commander'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { uninstallAllHooks, AGENT_FILE_PATHS, type AgentTarget } from '@agentbrain/core'

export function createDisableCommand(): Command {
  const disable = new Command('disable')
    .description('Disable or uninstall AgentBrain from this repository')
    .option('--remove-hooks', 'Remove git hooks only')
    .option('--remove-files', 'Remove generated context files only')
    .option('--remove-agent-files', 'Remove agent config files (CLAUDE.md, .cursorrules, etc.)')
    .option('--full', 'Complete uninstall (removes everything)')
    .option('--yes', 'Skip confirmation prompts')
    .action(async (options) => {
      const repoPath = process.cwd()

      // If no specific options, ask what to remove
      let removeHooks = options.removeHooks || options.full
      let removeFiles = options.removeFiles || options.full
      let removeAgentFiles = options.removeAgentFiles || options.full

      if (!options.removeHooks && !options.removeFiles && !options.removeAgentFiles && !options.full) {
        console.log(chalk.yellow('\n🔧 AgentBrain Disable Options\n'))

        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'toRemove',
            message: 'What would you like to remove?',
            choices: [
              { name: 'Git hooks (post-commit auto-regeneration)', value: 'hooks', checked: true },
              { name: 'Generated context files (agentbrain/ directory)', value: 'files' },
              { name: 'Agent config files (CLAUDE.md, .cursorrules, etc.)', value: 'agent-files' },
            ],
          },
        ])

        removeHooks = answers.toRemove.includes('hooks')
        removeFiles = answers.toRemove.includes('files')
        removeAgentFiles = answers.toRemove.includes('agent-files')

        if (answers.toRemove.length === 0) {
          console.log(chalk.yellow('Nothing selected. Exiting.'))
          return
        }
      }

      // Confirm if not --yes
      if (!options.yes) {
        const summary: string[] = []
        if (removeHooks) summary.push('• Remove git hooks')
        if (removeFiles) summary.push('• Delete agentbrain/ directory')
        if (removeAgentFiles) summary.push('• Delete agent config files')

        console.log(chalk.yellow('\nThis will:'))
        summary.forEach((item) => console.log(chalk.yellow(item)))

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Continue?',
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('Cancelled.'))
          return
        }
      }

      console.log('')

      // Remove git hooks
      if (removeHooks) {
        try {
          const result = await uninstallAllHooks(repoPath)
          if (result.uninstalled.length > 0) {
            console.log(chalk.green(`✓ Removed git hooks: ${result.uninstalled.join(', ')}`))
          } else {
            console.log(chalk.gray('  No git hooks found'))
          }
        } catch (error) {
          console.error(chalk.red(`✗ Failed to remove git hooks: ${error instanceof Error ? error.message : String(error)}`))
        }
      }

      // Remove generated files
      if (removeFiles) {
        const agentbrainDir = join(repoPath, 'agentbrain')
        if (existsSync(agentbrainDir)) {
          try {
            await rm(agentbrainDir, { recursive: true, force: true })
            console.log(chalk.green('✓ Removed agentbrain/ directory'))
          } catch (error) {
            console.error(chalk.red(`✗ Failed to remove agentbrain/: ${error instanceof Error ? error.message : String(error)}`))
          }
        } else {
          console.log(chalk.gray('  No agentbrain/ directory found'))
        }
      }

      // Remove agent files
      if (removeAgentFiles) {
        const removedFiles: string[] = []
        for (const [agent, filePath] of Object.entries(AGENT_FILE_PATHS)) {
          const fullPath = join(repoPath, filePath)

          // Special case: Cursor has both modern and legacy paths
          if (agent === 'cursor') {
            const modernPath = join(repoPath, '.cursorrules')
            const legacyPath = join(repoPath, '.cursor', 'rules')

            if (existsSync(modernPath)) {
              await rm(modernPath)
              removedFiles.push('.cursorrules')
            }
            if (existsSync(legacyPath)) {
              await rm(legacyPath)
              removedFiles.push('.cursor/rules')
            }
          } else if (existsSync(fullPath)) {
            await rm(fullPath)
            removedFiles.push(filePath)
          }
        }

        if (removedFiles.length > 0) {
          console.log(chalk.green(`✓ Removed agent files: ${removedFiles.join(', ')}`))
        } else {
          console.log(chalk.gray('  No agent config files found'))
        }
      }

      console.log(chalk.green('\n✓ AgentBrain disabled successfully'))

      // Show how to re-enable
      if (removeHooks || removeFiles || removeAgentFiles) {
        console.log(chalk.gray('\nTo re-enable AgentBrain, run: agentbrain setup'))
      }
    })

  return disable
}
