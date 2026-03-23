// Setup command - one-command complete setup

import { Command } from 'commander'
import { confirm, checkbox } from '@inquirer/prompts'
import { resolve } from 'node:path'
import {
  isGitRepository,
  installAllHooks,
  detectAgents,
  loadAIConfig,
  generateContext,
  injectIntoAgentFile,
  AGENT_FILE_PATHS,
  type AgentTarget,
} from '@agentbrain/core'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  displayBanner,
  success,
  error,
  info,
  spinner,
  displayGeneratedFiles,
  displayActualCost,
} from '../display.js'

export function createSetupCommand(): Command {
  const cmd = new Command('setup')
    .description('One-command setup for AgentBrain (init + hooks + agent files)')
    .option('--path <path>', 'Repository path', process.cwd())
    .option('--skip-hooks', 'Skip git hooks installation')
    .option('--skip-agent-files', 'Skip agent file injection')
    .action(async (options) => {
      try {
        await runSetup(options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Setup failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runSetup(options: {
  path: string
  skipHooks: boolean
  skipAgentFiles: boolean
}): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  info(`Repository: ${repoPath}`)
  console.log()

  // Check git repository
  if (!isGitRepository(repoPath)) {
    error('Not a git repository. Please run "git init" first.')
    process.exit(1)
  }

  // Step 1: Detect or select agents
  let selectedAgents = detectAgents(repoPath)

  if (selectedAgents.length === 0 && !options.skipAgentFiles) {
    info('No agent files detected. Which agent(s) do you use?\n')

    const agents = await checkbox({
      message: 'Select all that apply:',
      choices: [
        { name: 'Claude Code (CLAUDE.md)', value: 'claude-code' },
        { name: 'Cursor (.cursorrules)', value: 'cursor' },
        { name: 'Windsurf (.windsurfrules)', value: 'windsurf' },
      ],
    })

    selectedAgents = agents as AgentTarget[]

    if (selectedAgents.length === 0) {
      info('\nNo agents selected. Skipping agent file creation.')
    }
  }

  // Step 2: Load AI config
  info('\nLoading AI configuration...')
  const aiConfig = await loadAIConfig()
  info(`✓ Using ${aiConfig.provider} API`)

  // Step 3: Generate context
  console.log()
  const confirmed = await confirm({
    message: 'Generate initial context documentation?',
    default: true,
  })

  if (!confirmed) {
    info('Skipping context generation.')
    return
  }

  const spin = spinner('Generating context...')

  const result = await generateContext({
    repoPath,
    aiConfig,
    maxFiles: 100,
    useCache: true,
    onProgress: (msg) => {
      spin.text = msg
    },
  })

  spin.succeed('Context generated!')

  // Write files
  const outputDir = join(repoPath, 'agentbrain')
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  for (const doc of result.docs) {
    const fileName = `${doc.type}.md`
    const filePath = join(outputDir, fileName)
    await writeFile(filePath, doc.content, 'utf-8')
  }

  // Get git hash from result
  const gitHash = result.docs[0]?.gitHash || 'unknown'

  // Step 4: Inject into agent files
  if (!options.skipAgentFiles && selectedAgents.length > 0) {
    console.log()
    info('Updating agent files...')

    for (const agent of selectedAgents) {
      const result = await injectIntoAgentFile(repoPath, agent, gitHash)
      const filePath = AGENT_FILE_PATHS[agent]

      if (result.created) {
        console.log(`  ✓ Created ${filePath}`)
      } else if (result.updated) {
        console.log(`  ✓ Updated ${filePath}`)
      } else {
        console.log(`  ✓ Checked ${filePath}`)
      }
    }
  }

  // Step 5: Install git hooks
  if (!options.skipHooks) {
    console.log()
    const installHooks = await confirm({
      message: 'Install git hooks for auto-refresh on commits?',
      default: true,
    })

    if (installHooks) {
      const { installed } = await installAllHooks(repoPath)
      info('Git hooks installed:')
      for (const hook of installed) {
        console.log(`  ✓ ${hook}`)
      }
    }
  }

  // Summary
  console.log()
  displayGeneratedFiles([
    { name: 'agentbrain/context.md', description: 'Full repo intelligence' },
    { name: 'agentbrain/dependency-map.md', description: 'Service relationships' },
    { name: 'agentbrain/patterns.md', description: 'Coding patterns' },
  ])

  displayActualCost(result.totalTokens, result.cost)

  console.log()
  success('🎉 AgentBrain setup complete!')
  console.log()
  console.log('What happens now:')
  console.log('  ✓ Your agent will automatically load context at session start')
  console.log('  ✓ Context refreshes automatically after every commit')
  console.log('  ✓ Handoff documents generated automatically')
  console.log()
  console.log('Just start coding - AgentBrain works invisibly in the background!')
  console.log()
}
