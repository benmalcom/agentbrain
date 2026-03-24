// Task-aware context command

import { Command } from 'commander'
import { resolve } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadAIConfig,
  generateTaskContext,
  invalidateCache,
} from '@agentbrain/core'
import { displayBanner, success, error, info, spinner } from '../display.js'

export function createContextCommand(): Command {
  const cmd = new Command('context')
    .description('Generate task-focused context using cached summaries')
    .argument('<task>', 'Task description (e.g., "add OAuth login to auth module")')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--max-files <number>', 'Maximum files to include', '20')
    .option('--output <path>', 'Output file path', 'agentbrain/task-context.md')
    .option('--no-cache', 'Force re-scan (invalidate cache first)')
    .action(async (task: string, options) => {
      try {
        await runContextCommand(task, options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Context generation failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runContextCommand(
  task: string,
  options: {
    path: string
    maxFiles: string
    output: string
    cache: boolean
  }
): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  const maxFiles = parseInt(options.maxFiles, 10)
  const outputPath = resolve(repoPath, options.output)

  info(`Repository: ${repoPath}`)
  info(`Task: "${task}"`)
  console.log()

  // Invalidate cache if --no-cache
  if (!options.cache) {
    info('Invalidating cache...')
    await invalidateCache(repoPath)
  }

  // Load AI config
  const aiConfig = await loadAIConfig()

  const spin = spinner('Generating task-focused context...')

  try {
    const result = await generateTaskContext({
      repoPath,
      aiConfig,
      task,
      maxFiles,
      onProgress: (msg) => {
        spin.text = msg
      },
    })

    spin.succeed('Context generated!')

    // Ensure output directory exists
    const outputDir = join(repoPath, 'agentbrain')
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }

    // Write task context
    const header = `# Task Context: ${task}

*Generated on ${new Date().toISOString()}*
*Selected ${result.selectedFiles.length} most relevant files*

---

`
    await writeFile(outputPath, header + result.content, 'utf-8')

    console.log()
    success(`Task: "${task}"`)
    success(
      `Scored ${result.totalFilesScored} files against task (used cached summaries)`
    )
    success(`Selected top ${result.selectedFiles.length} most relevant files`)
    success(`${options.output} written`)

    console.log()
    info(`💸 Cost: ~$${result.cost.toFixed(4)} (re-used cached summaries)`)
    console.log()

    // Show top 5 files
    console.log('📄 Top relevant files:')
    result.selectedFiles.slice(0, 5).forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.path} (score: ${f.score}/10)`)
    })
    console.log()
  } catch (err) {
    spin.fail('Context generation failed')
    throw err
  }
}
