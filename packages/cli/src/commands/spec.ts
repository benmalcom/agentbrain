// Spec command - generate structured specification for a task

import { Command } from 'commander'
import { input } from '@inquirer/prompts'
import { resolve } from 'node:path'
import { createSpec, loadAIConfig } from '@agentbrain/core'
import type { SpecAnswers } from '@agentbrain/core'
import { displayBanner, success, error, info, spinner } from '../display.js'

export function createSpecCommand(): Command {
  const cmd = new Command('spec')
    .description('Generate structured specification for a task')
    .argument('<task>', 'Task description (e.g., "add stripe webhook handler")')
    .option('--path <path>', 'Repository path', process.cwd())
    .action(async (task: string, options) => {
      try {
        await runSpecCommand(task, options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Spec generation failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runSpecCommand(
  task: string,
  options: { path: string }
): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  info(`Repository: ${repoPath}`)
  info(`Task: "${task}"`)
  console.log()

  // Load AI config
  const aiConfig = await loadAIConfig()

  // Ask the 5 questions interactively
  console.log('📋 Please answer the following questions to generate your spec:\n')

  const answers: SpecAnswers = {
    problem: await input({
      message: 'Q1: What problem does this solve? (1-2 sentences)',
      validate: (value) => {
        if (!value.trim()) return 'Please provide an answer'
        return true
      },
    }),

    approach: await input({
      message: 'Q2: What\'s your approach or implementation idea? (or "not sure yet")',
      default: 'Not sure yet',
    }),

    outOfScope: await input({
      message: 'Q3: What should the agent NOT touch or change?',
      default: 'None',
    }),

    doneCriteria: await input({
      message: 'Q4: What does "done" look like? (acceptance criteria)',
      validate: (value) => {
        if (!value.trim()) return 'Please provide an answer'
        return true
      },
    }),

    risks: await input({
      message: 'Q5: Any edge cases or risks to consider?',
      default: 'None identified',
    }),
  }

  console.log()
  const spin = spinner('Generating spec...')

  try {
    const result = await createSpec(task, answers, repoPath, aiConfig)

    spin.succeed('Spec generated!')

    console.log()
    success(`✓ Spec saved to: ${result.filePath}`)
    console.log()
    info(`💸 Cost: ~$${result.cost.toFixed(4)} (${result.tokensUsed} tokens)`)
    console.log()
    console.log('Next steps:')
    console.log('  1. Review the spec file')
    console.log('  2. Share it with your AI coding agent')
    console.log('  3. Start implementing!')
    console.log()
  } catch (err) {
    spin.fail('Spec generation failed')
    throw err
  }
}
