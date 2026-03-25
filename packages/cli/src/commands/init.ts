// Init command - generate context docs

import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { resolve } from 'node:path'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadAIConfig,
  generateContext,
  estimateContextCost,
  scanRepository,
  injectIntoAllAgents,
  detectAgents,
  AGENT_FILE_PATHS,
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
    .option('--smart-cache', 'Reuse file summaries for unchanged files (fast)')
    .option('--dry-run', 'Show what would be generated without actually generating')
    .option('--silent', 'Suppress output (for git hooks)')
    .option('--no-confirm', 'Skip confirmation prompts')
    .option('--no-inject', 'Skip agent file injection')
    .action(async (options) => {
      try {
        await runInit(options)
      } catch (err) {
        if (!options.silent) {
          error(err instanceof Error ? err.message : 'Initialization failed')
        }
        process.exit(1)
      }
    })

  return cmd
}

async function runInit(options: {
  path: string
  maxFiles: string
  cache: boolean
  smartCache: boolean
  dryRun: boolean
  silent: boolean
  confirm: boolean
  inject: boolean
}): Promise<void> {
  const silent = options.silent

  if (!silent) {
    displayBanner()
  }

  const repoPath = resolve(options.path)
  const maxFiles = parseInt(options.maxFiles, 10)
  const useCache = options.cache
  const smartCache = options.smartCache
  const skipConfirm = !options.confirm
  const skipInject = !options.inject

  if (!silent) {
    info(`Repository: ${repoPath}`)
  }

  // Load AI config
  const aiConfig = await loadAIConfig()

  if (!silent) {
    displayProviderInfo(aiConfig.provider, aiConfig.models)
  }

  // Scan repository
  const spin = silent ? null : spinner('Scanning repository...')
  const scanResult = await scanRepository(repoPath, { maxFiles })

  if (!silent) {
    spin?.succeed(`Found ${scanResult.totalFiles} files, selected ${scanResult.relevantFiles.length} relevant files`)
    console.log()
    displayFileTable(scanResult.relevantFiles, 8)
  }

  // Estimate cost
  if (!silent) {
    info('Estimating cost...')
  }
  const estimate = await estimateContextCost(repoPath, aiConfig, maxFiles)

  if (!silent) {
    displayCostEstimate(estimate)
  }

  if (options.dryRun) {
    if (!silent) {
      info('Dry run complete - no files generated')
    }
    return
  }

  // Confirm generation
  if (!skipConfirm) {
    const confirmed = await confirm({
      message: 'Generate context docs?',
      default: true,
    })

    if (!confirmed) {
      if (!silent) {
        info('Cancelled')
      }
      return
    }
  }

  // Generate context
  const genSpin = silent ? null : spinner('Generating context documents...')
  let lastProgress = ''

  const result = await generateContext({
    repoPath,
    aiConfig,
    maxFiles,
    useCache,
    smartCache,
    onProgress: (msg) => {
      if (!silent && msg !== lastProgress) {
        if (genSpin) {
          genSpin.text = msg
        }
        lastProgress = msg
      }
    },
  })

  if (!silent) {
    genSpin?.succeed('Context generation complete!')
  }

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

  // Inject into agent files
  if (!skipInject) {
    const agents = detectAgents(repoPath)

    if (agents.length > 0) {
      const gitHash = scanResult.gitHash
      const injectionResults = await injectIntoAllAgents(repoPath, gitHash)

      if (!silent && injectionResults.length > 0) {
        console.log()
        info('Updated agent files with context loading instructions:')
        for (const { agent, created, updated } of injectionResults) {
          const action = created ? 'Created' : updated ? 'Updated' : 'Checked'
          console.log(`  ✓ ${action} ${AGENT_FILE_PATHS[agent]}`)
        }
      }
    } else if (!silent) {
      console.log()
      info('No agent files detected. Create CLAUDE.md, .cursor/rules, or .windsurfrules to enable auto-injection.')
    }
  }

  // Display summary
  if (!silent) {
    displayGeneratedFiles([
      { name: 'agentbrain/context.md', description: 'Full repo intelligence' },
      { name: 'agentbrain/dependency-map.md', description: 'Service relationships' },
      { name: 'agentbrain/patterns.md', description: 'Coding patterns' },
    ])

    displayActualCost(result.totalTokens, result.cost)

    const nextSteps: string[] = []

    // Only suggest setup if git hook is not already installed
    const hookPath = join(repoPath, '.git', 'hooks', 'post-commit')
    let hasHook = false
    if (existsSync(hookPath)) {
      try {
        const content = await readFile(hookPath, 'utf-8')
        hasHook = content.includes('AgentBrain')
      } catch {
        // Ignore read errors
      }
    }

    if (!hasHook) {
      nextSteps.push('Run "agentbrain setup" to install git hooks for auto-refresh')
    }

    if (detectAgents(repoPath).length === 0) {
      nextSteps.push('Create CLAUDE.md, .cursor/rules, or .windsurfrules for your agent')
    }

    if (nextSteps.length > 0) {
      displayNextSteps(nextSteps)
    }

    success('AgentBrain initialization complete!')
  }
}
