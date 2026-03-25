// Standards command - generate CLAUDE.md / .cursorrules / .windsurfrules

import { Command } from 'commander'
import { input, select } from '@inquirer/prompts'
import { resolve } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { loadAIConfig, generateStandards, AGENT_FILE_PATHS } from '@agentbrain/core'
import type { AgentTarget, StackAnswers } from '@agentbrain/core'
import { displayBanner, success, error, info, spinner, displayGeneratedFiles } from '../display.js'

export function createStandardsCommand(): Command {
  const cmd = new Command('standards')
    .description('Generate coding standards files for AI agents')
    .option('--path <path>', 'Repository path', process.cwd())
    .action(async (options) => {
      try {
        await runStandards(options)
      } catch (err) {
        error(err instanceof Error ? err.message : 'Standards generation failed')
        process.exit(1)
      }
    })

  return cmd
}

async function runStandards(options: { path: string }): Promise<void> {
  displayBanner()

  const repoPath = resolve(options.path)
  info(`Repository: ${repoPath}`)

  // Load AI config
  const aiConfig = await loadAIConfig()
  info(`Using ${aiConfig.provider} API\n`)

  // Gather stack information
  console.log('📋 Tell me about your stack:\n')

  const language = await input({
    message: 'Primary language:',
    default: 'TypeScript',
  })

  const framework = await input({
    message: 'Framework:',
    default: 'Node.js',
  })

  const testingLib = await input({
    message: 'Testing library:',
    default: 'Jest',
  })

  const styleGuide = await input({
    message: 'Style guide:',
    default: 'Prettier + ESLint',
  })

  const antiPatternsInput = await input({
    message: 'Anti-patterns to avoid (comma-separated):',
    default: 'global state, any types, console.log in production',
  })

  const architectureNotes = await input({
    message: 'Architecture notes:',
    default: 'Clean architecture, dependency injection',
  })

  const antiPatterns = antiPatternsInput.split(',').map((s) => s.trim())

  const stackAnswers: StackAnswers = {
    language,
    framework,
    testingLib,
    styleGuide,
    antiPatterns,
    architectureNotes,
  }

  // Select target agents
  const agentChoice = await select<'all' | AgentTarget>({
    message: 'Which agent do you want to generate standards for?',
    choices: [
      { name: 'All agents (Claude Code, Cursor, Windsurf)', value: 'all' },
      { name: 'Claude Code (CLAUDE.md)', value: 'claude-code' },
      { name: 'Cursor (.cursor/rules)', value: 'cursor' },
      { name: 'Windsurf (.windsurfrules)', value: 'windsurf' },
    ],
  })

  const agents: AgentTarget[] =
    agentChoice === 'all'
      ? ['claude-code', 'cursor', 'windsurf']
      : [agentChoice]

  // Show what's being generated
  console.log()
  if (agentChoice === 'all') {
    info('Generating standards for all agents (Claude Code, Cursor, Windsurf)')
  } else {
    const agentNames = {
      'claude-code': 'Claude Code',
      cursor: 'Cursor',
      windsurf: 'Windsurf',
    }
    info(`Generating standards for ${agentNames[agentChoice]} only`)
  }
  console.log()

  // Generate standards
  const spin = spinner('Generating standards files...')

  const output = await generateStandards({
    repoPath,
    aiConfig,
    stackAnswers,
    agents,
  })

  spin.succeed('Standards generation complete!')

  // Write files to disk
  const generatedFiles: Array<{ name: string; description: string }> = []

  for (const agent of agents) {
    const content = output[agent]
    if (!content) continue

    const filePath = join(repoPath, AGENT_FILE_PATHS[agent])
    const dir = dirname(filePath)

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(filePath, content, 'utf-8')

    const descriptions = {
      'claude-code': 'Claude Code standards',
      cursor: 'Cursor AI rules',
      windsurf: 'Windsurf AI rules',
    }

    generatedFiles.push({
      name: AGENT_FILE_PATHS[agent],
      description: descriptions[agent],
    })
  }

  displayGeneratedFiles(generatedFiles)

  success('Standards files generated successfully!')

  console.log('\n💡 Tip: Run "agentbrain init" to inject context loading instructions into these files.\n')

  console.log('📌 Next steps:\n')
  if (agents.includes('claude-code')) {
    console.log('  • Claude Code will automatically load CLAUDE.md on session start')
  }
  if (agents.includes('cursor')) {
    console.log('  • Cursor will automatically apply .cursor/rules')
  }
  if (agents.includes('windsurf')) {
    console.log('  • Windsurf will automatically apply .windsurfrules')
  }
  console.log()
}
