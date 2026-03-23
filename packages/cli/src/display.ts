// CLI UI helpers using chalk, ora, and cli-table3

import chalk from 'chalk'
import ora from 'ora'
import Table from 'cli-table3'
import type { FileEntry, CostEstimate } from '@agentbrain/core'

/**
 * Display welcome banner
 */
export function displayBanner(): void {
  console.log(chalk.cyan.bold('\n🧠 AgentBrain\n'))
}

/**
 * Display success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message)
}

/**
 * Display error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message)
}

/**
 * Display info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message)
}

/**
 * Display warning message
 */
export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message)
}

/**
 * Create a spinner
 */
export function spinner(text: string) {
  return ora(text).start()
}

/**
 * Display file table
 */
export function displayFileTable(files: FileEntry[], maxRows: number = 8): void {
  const table = new Table({
    head: [chalk.cyan('File'), chalk.cyan('Language'), chalk.cyan('Size (KB)')],
    colWidths: [50, 20, 15],
  })

  const displayFiles = files.slice(0, maxRows)

  for (const file of displayFiles) {
    table.push([
      file.path.length > 47 ? '...' + file.path.slice(-44) : file.path,
      file.language,
      (file.size / 1024).toFixed(1),
    ])
  }

  if (files.length > maxRows) {
    table.push([
      chalk.gray(`... and ${files.length - maxRows} more files`),
      chalk.gray(''),
      chalk.gray(''),
    ])
  }

  console.log(table.toString())
}

/**
 * Display cost estimate with 1.4x buffer for accuracy
 */
export function displayCostEstimate(estimate: CostEstimate): void {
  // Apply 1.4x buffer - estimates tend to be 30% under actual
  const bufferedTokens = Math.ceil(estimate.tokens * 1.4)
  const bufferedCost = estimate.usd * 1.4

  console.log(chalk.bold('\n💰 Cost estimate (up to):'))

  for (const item of estimate.breakdown) {
    const itemBuffered = Math.ceil(item.tokens * 1.4)
    console.log(
      `  ${chalk.gray('•')} ${item.label}: ${chalk.cyan(`~${itemBuffered.toLocaleString()} tokens`)}`
    )
  }

  console.log(
    chalk.bold(
      `\n  → Total: ${chalk.cyan(`~${bufferedTokens.toLocaleString()} tokens`)} ${chalk.green(`(~$${bufferedCost.toFixed(4)})`)}\n`
    )
  )
}

/**
 * Display actual cost after generation
 */
export function displayActualCost(tokens: number, usd: number): void {
  console.log(
    chalk.bold(
      `\n💸 Actual cost: ${chalk.cyan(`~${tokens.toLocaleString()} tokens`)} ${chalk.green(`(~$${usd.toFixed(4)})`)}\n`
    )
  )
}

/**
 * Display generated files summary
 */
export function displayGeneratedFiles(files: Array<{ name: string; description: string }>): void {
  console.log(chalk.bold('\n📄 Generated files:\n'))

  for (const file of files) {
    console.log(`  ${chalk.green('✓')} ${chalk.bold(file.name)} — ${chalk.gray(file.description)}`)
  }

  console.log()
}

/**
 * Display next steps
 */
export function displayNextSteps(steps: string[]): void {
  console.log(chalk.bold('\n📌 Next steps:\n'))

  for (const step of steps) {
    console.log(`  ${chalk.gray('•')} ${step}`)
  }

  console.log()
}

/**
 * Display provider info
 */
export function displayProviderInfo(provider: string, models: { fast: string; mid: string; smart: string }): void {
  console.log(chalk.bold(`\n🔑 Using ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API\n`))
  console.log(`  ${chalk.gray('Fast model:')} ${chalk.cyan(models.fast)}`)
  console.log(`  ${chalk.gray('Mid model:')}  ${chalk.cyan(models.mid)}`)
  console.log(`  ${chalk.gray('Smart model:')} ${chalk.cyan(models.smart)}`)
  console.log()
}
