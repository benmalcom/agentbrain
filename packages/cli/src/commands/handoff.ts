// Handoff command - generate handoff.md from git diff

import { Command } from 'commander'
import { input } from '@inquirer/prompts'
import { resolve } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadAIConfig, generateHandoff } from '@agentbrain/core'
import { displayBanner, success, error, info, spinner, displayGeneratedFiles } from '../display.js'

export function createHandoffCommand(): Command {
  const cmd = new Command('handoff')
    .description('Generate handoff document from git diff')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--goal <goal>', 'Session goal or objective')
    .option('--commits <number>', 'Number of recent commits to include (default: 5)', '5')
    .option('--auto', 'Auto mode - skip prompts and banner (for git hooks)')
    .action(async (options) => {
      try {
        await runHandoff(options)
      } catch (err) {
        if (!options.auto) {
          error(err instanceof Error ? err.message : 'Handoff generation failed')
        }
        process.exit(1)
      }
    })

  return cmd
}

async function runHandoff(options: {
  path: string
  goal?: string
  commits: string
  auto: boolean
}): Promise<void> {
  const auto = options.auto

  if (!auto) {
    displayBanner()
  }

  const repoPath = resolve(options.path)

  if (!auto) {
    info(`Repository: ${repoPath}`)
  }

  // Load AI config
  const aiConfig = await loadAIConfig()

  if (!auto) {
    info(`Using ${aiConfig.provider} API\n`)
  }

  // Parse commit count
  const commitCount = parseInt(options.commits, 10)
  if (isNaN(commitCount) || commitCount < 1) {
    throw new Error('Commits must be a positive number')
  }

  // Get session goal if not provided
  let goal = options.goal

  if (!goal && !auto) {
    goal = await input({
      message: 'Session goal (optional):',
      default: '',
    })
  }

  // Generate handoff
  const spin = auto ? null : spinner('Analyzing changes and generating handoff...')

  const result = await generateHandoff({
    repoPath,
    aiConfig,
    goal: goal || undefined,
    commitCount,
  })

  if (!auto) {
    spin?.succeed('Handoff generation complete!')
  }

  // Write to disk
  const outputDir = join(repoPath, 'agentbrain')
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  const filePath = join(outputDir, 'handoff.md')
  await writeFile(filePath, result.doc.content, 'utf-8')

  if (!auto) {
    displayGeneratedFiles([
      { name: 'agentbrain/handoff.md', description: 'Session handoff document' },
    ])

    if (result.tokenCount > 0) {
      const cost =
        aiConfig.provider === 'anthropic' ? (result.tokenCount / 1_000_000) * 3.0 : (result.tokenCount / 1_000_000) * 2.5
      info(`Tokens used: ${result.tokenCount.toLocaleString()} (~$${cost.toFixed(4)})`)
    } else {
      info('No AI tokens used (no changes detected)')
    }

    success('Handoff document generated!')

    console.log('\n📌 Next steps:\n')
    console.log('  • Share agentbrain/handoff.md with the next developer or session')
    console.log('  • Reference it at the start of your next session for context')
    console.log()
  }
}
