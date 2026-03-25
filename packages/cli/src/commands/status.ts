// Status command - show git hook update log

import { Command } from 'commander'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { displayBanner, info, error } from '../display.js'
import { loadAgentConfig } from '@agentbrain/core'
import chalk from 'chalk'

export function createStatusCommand(): Command {
  const cmd = new Command('status')
    .description('Show git hook auto-update log')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--lines <number>', 'Number of recent entries to show', '10')
    .action(async (options) => {
      try {
        await runStatusCommand(options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Status check failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runStatusCommand(options: {
  path: string
  lines: string
}): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  const logPath = join(repoPath, '.agentbrain', 'update.log')
  const maxLines = parseInt(options.lines, 10)

  info(`Repository: ${repoPath}\n`)

  // Show configured agents
  const config = await loadAgentConfig(repoPath)
  if (config) {
    console.log(chalk.bold('Configured agents:'))
    console.log(chalk.gray(`  ${config.selectedAgents.join(', ')}`))
    console.log(chalk.gray(`  Setup: ${new Date(config.setupAt).toLocaleString()}`))
    console.log()
  }

  if (!existsSync(logPath)) {
    console.log(chalk.yellow('No update log found'))
    console.log(chalk.gray('The git hook will create .agentbrain/update.log on the next commit.\n'))
    return
  }

  const content = await readFile(logPath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)

  if (lines.length === 0) {
    console.log(chalk.yellow('Update log is empty\n'))
    return
  }

  // Show most recent entries
  const entriesToShow = lines.slice(-maxLines).reverse()

  console.log(chalk.bold('Auto-update history:\n'))

  for (const line of entriesToShow) {
    // Parse: "2026-03-25 08:41:22 | Git: 130cc737 | SUCCESS | $0.00 cached | 3s"
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 5) {
      console.log(chalk.gray(line))
      continue
    }

    const [timestamp, gitInfo, status, cost, duration] = parts

    const statusColor =
      status === 'SUCCESS' ? chalk.green : chalk.red
    const statusIcon = status === 'SUCCESS' ? '✓' : '✗'

    console.log(
      `${chalk.gray(timestamp)} ${statusColor(statusIcon)} ${chalk.gray(gitInfo)} ${statusColor(status)} ${chalk.gray(cost)} ${chalk.gray(duration)}`
    )
  }

  console.log()
  console.log(chalk.gray(`Showing ${entriesToShow.length} of ${lines.length} total entries`))
  console.log(chalk.gray(`Log file: ${logPath}\n`))
}
