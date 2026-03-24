// Diagnostic command for AgentBrain setup

import { Command } from 'commander'
import { resolve } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { runDiagnostics } from '@agentbrain/core'
import type { DoctorCheck, DoctorResult } from '@agentbrain/core'
import chalk from 'chalk'
import { displayBanner, error } from '../display.js'

const execAsync = promisify(exec)

export function createDoctorCommand(): Command {
  const cmd = new Command('doctor')
    .description('Run diagnostic checks for AgentBrain setup')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--fix', 'Attempt to auto-fix warnings')
    .option('--json', 'Output JSON for programmatic use')
    .action(async (options) => {
      try {
        await runDoctorCommand(options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Doctor checks failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runDoctorCommand(options: {
  path: string
  fix?: boolean
  json?: boolean
}): Promise<void> {
  const repoPath = resolve(options.path)

  // Run diagnostics
  const result = await runDiagnostics(repoPath)

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  // Human-readable output
  displayBanner()
  console.log(chalk.bold(`AgentBrain Doctor — ${repoPath}\n`))
  console.log(chalk.gray('Checking setup...\n'))

  // Display all checks
  for (const check of result.checks) {
    const icon = getCheckIcon(check.status)
    const color = getCheckColor(check.status)
    const name = check.name.padEnd(20)
    console.log(`  ${icon} ${color(name)} ${check.message}`)
  }

  console.log()

  // Display warnings section
  const warnings = result.checks.filter((c) => c.status === 'warn' || c.status === 'fail')
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('Warnings:\n'))
    for (const check of warnings) {
      const icon = getCheckIcon(check.status)
      console.log(`  ${icon} ${check.name.padEnd(20)} ${check.message}`)
      if (check.fix) {
        console.log(`  ${' '.repeat(22)} ${chalk.gray(`fix: ${check.fix}`)}`)
      }
    }
    console.log()
  }

  // Score
  console.log(
    chalk.bold(
      `Score: ${chalk.green(result.score.passed)}/${result.score.total} checks passed`
    )
  )

  if (warnings.length > 0 && !options.fix) {
    console.log(chalk.gray('\nRun "agentbrain doctor --fix" to auto-fix warnings.\n'))
  }

  // Auto-fix
  if (options.fix && warnings.length > 0) {
    console.log(chalk.yellow.bold('\nAttempting auto-fixes...\n'))
    await runAutoFixes(warnings, repoPath)
  }

  // Exit code
  const hasFails = result.checks.some((c) => c.status === 'fail')
  if (hasFails) {
    process.exit(1)
  }
}

async function runAutoFixes(
  warnings: DoctorCheck[],
  repoPath: string
): Promise<void> {
  for (const check of warnings) {
    if (!check.fix) continue

    console.log(`  ${chalk.cyan('→')} Fixing ${check.name}...`)

    try {
      // Execute fix command
      const { stdout, stderr } = await execAsync(check.fix, { cwd: repoPath })

      if (stderr && !stderr.includes('warning')) {
        console.log(`  ${chalk.yellow('⚠')} ${check.name}: ${stderr.trim()}`)
      } else {
        console.log(`  ${chalk.green('✓')} ${check.name} fixed`)
      }

      if (stdout) {
        console.log(chalk.gray(`    ${stdout.trim()}`))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.log(`  ${chalk.red('✗')} ${check.name}: ${message}`)
    }
  }

  console.log()
  console.log(chalk.green('Auto-fix complete. Run "agentbrain doctor" again to verify.\n'))
}

function getCheckIcon(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return chalk.green('✓')
    case 'warn':
      return chalk.yellow('⚠')
    case 'fail':
      return chalk.red('✗')
  }
}

function getCheckColor(status: 'pass' | 'warn' | 'fail') {
  switch (status) {
    case 'pass':
      return chalk.green
    case 'warn':
      return chalk.yellow
    case 'fail':
      return chalk.red
  }
}
