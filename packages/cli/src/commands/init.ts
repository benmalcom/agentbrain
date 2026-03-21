// Init command - generate context docs

import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { resolve } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadAIConfig,
  generateContext,
  estimateContextCost,
  scanRepository,
} from '@agentbrain/core'
import {
  displayBanner,
  success,
  error,
  info,
  spinner,
  displayFileTable,
  displayCostEstimate,
  displayActualCost,
  displayGeneratedFiles,
  displayNextSteps,
  displayProviderInfo,
} from '../display.js'

export function createInitCommand(): Command {
  const cmd = new Command('init')
    .description('Generate context documentation for your repository')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--max-files <number>', 'Maximum files to analyze', '100')
    .option('--no-cache', 'Skip cache and regenerate')
    .option('--dry-run', 'Show what would be generated without actually generating')
    .action(async (options) => {
      try {
        await runInit(options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Initialization failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runInit(options: {
  path: string
  maxFiles: string
  cache: boolean
  dryRun: boolean
}): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  const maxFiles = parseInt(options.maxFiles, 10)
  const useCache = options.cache

  info(`Repository: ${repoPath}`)

  // Load AI config
  const aiConfig = await loadAIConfig()

  displayProviderInfo(aiConfig.provider, aiConfig.models)

  // Scan repository
  const spin = spinner('Scanning repository...')
  const scanResult = await scanRepository(repoPath, { maxFiles })
  spin.succeed(`Found ${scanResult.totalFiles} files, selected ${scanResult.relevantFiles.length} relevant files`)

  console.log()
  displayFileTable(scanResult.relevantFiles, 8)

  // Estimate cost
  info('Estimating cost...')
  const estimate = await estimateContextCost(repoPath, aiConfig, maxFiles)
  displayCostEstimate(estimate)

  if (options.dryRun) {
    info('Dry run complete - no files generated')
    return
  }

  // Confirm generation
  const confirmed = await confirm({
    message: 'Generate context docs?',
    default: true,
  })

  if (!confirmed) {
    info('Cancelled')
    return
  }

  // Generate context
  const genSpin = spinner('Generating context documents...')
  let lastProgress = ''

  const result = await generateContext({
    repoPath,
    aiConfig,
    maxFiles,
    useCache,
    onProgress: (msg) => {
      if (msg !== lastProgress) {
        genSpin.text = msg
        lastProgress = msg
      }
    },
  })

  genSpin.succeed('Context generation complete!')

  // Write files to disk
  const outputDir = join(repoPath, 'agentbrain')
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  for (const doc of result.docs) {
    const fileName = `${doc.type}.md`
    const filePath = join(outputDir, fileName)
    await writeFile(filePath, doc.content, 'utf-8')
  }

  // Display summary
  displayGeneratedFiles([
    { name: 'agentbrain/context.md', description: 'Full repo intelligence' },
    { name: 'agentbrain/dependency-map.md', description: 'Service relationships' },
    { name: 'agentbrain/patterns.md', description: 'Coding patterns' },
  ])

  displayActualCost(result.totalTokens, result.cost)

  displayNextSteps([
    'Add to your CLAUDE.md: @agentbrain/context.md',
    'Run "agentbrain standards" to generate coding standards files',
    'Run "agentbrain handoff" before ending sessions',
  ])

  success('AgentBrain initialization complete!')
}
