// agentbrain doom - detect doom loops in git history

import { Command } from 'commander'
import chalk from 'chalk'
import { analyzeDoomLoop } from '@agentbrain/core'

export function createDoomCommand(): Command {
  const doom = new Command('doom')
    .description('Detect doom loops - files modified repeatedly in recent commits')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--commits <number>', 'Number of commits to analyze', '10')
    .option('--threshold <number>', 'Threshold for doom loop detection', '4')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      const { path, commits, threshold, json } = options

      if (!json) {
        console.log(chalk.blue.bold('\n🧠 AgentBrain\n'))
      }

      try {
        const result = await analyzeDoomLoop(path, parseInt(commits), parseInt(threshold))

        // JSON output mode
        if (json) {
          console.log(JSON.stringify(result, null, 2))
          return
        }

        // Human-readable output mode
        if (result.detected) {
          console.log(chalk.yellow.bold('⚠ Possible doom loop detected\n'))
          console.log(
            `These files were modified ${threshold}+ times in the last ${result.commitsAnalyzed} commits:\n`
          )

          for (const file of result.files) {
            console.log(
              chalk.red(`  ${file.path}`) +
                chalk.gray(` (${file.commitCount} times - ${file.percentage}%)`)
            )
          }

          console.log(chalk.yellow('\nSuggestions:'))
          console.log(chalk.gray('  → Stop coding. Investigate root cause first.'))
          console.log(chalk.gray('  → Run: agentbrain spec "fix [problem description]"'))
          console.log(chalk.gray('  → Consider: revert to last working state and start fresh'))
          console.log('')
        } else {
          console.log(chalk.green('✓ No doom loop detected'))
          console.log(
            chalk.gray(
              `ℹ Analyzed last ${result.commitsAnalyzed} commits — all files look healthy\n`
            )
          )
        }
      } catch (error) {
        if (json) {
          console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
        } else {
          if (error instanceof Error) {
            if (error.message.includes('Not a git repository')) {
              console.error(chalk.red('✗ Error: Not a git repository'))
              console.error(chalk.gray('Run this command from a git repository\n'))
            } else {
              console.error(chalk.red('✗ Error:'), error.message, '\n')
            }
          }
        }
        process.exit(1)
      }
    })

  return doom
}
