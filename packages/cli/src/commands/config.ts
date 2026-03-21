// Config command - set/view API key

import { Command } from 'commander'
import { input } from '@inquirer/prompts'
import { saveAPIKey, loadAPIKey, getConfigPath, detectProvider } from '@agentbrain/core'
import { success, error, info, warn } from '../display.js'

export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Configure AgentBrain API key')
    .option('--show', 'Show current configuration')
    .action(async (options) => {
      try {
        if (options.show) {
          await showConfig()
        } else {
          await setConfig()
        }
      } catch (err) {
        error(err instanceof Error ? err.message : 'Configuration failed')
        process.exit(1)
      }
    })

  return cmd
}

async function showConfig(): Promise<void> {
  const config = await loadAPIKey()

  if (!config) {
    info('No API key configured')
    info(`Config file: ${getConfigPath()}`)
    console.log('\nYou can set an API key with: agentbrain config')
    console.log('Or use environment variables: ANTHROPIC_API_KEY or OPENAI_API_KEY')
    return
  }

  const maskedKey = maskAPIKey(config.apiKey)
  success(`API key configured: ${maskedKey}`)
  info(`Provider: ${config.provider}`)
  info(`Config file: ${getConfigPath()}`)

  if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
    warn('Note: Environment variable will take priority over stored config')
  }
}

async function setConfig(): Promise<void> {
  console.log('\n🔑 Configure API Key\n')
  console.log('AgentBrain supports Anthropic (Claude) and OpenAI (GPT) APIs.')
  console.log('Your key will be stored securely at:', getConfigPath())
  console.log()

  const apiKey = await input({
    message: 'Enter your API key:',
    validate: (value) => {
      if (!value.trim()) {
        return 'API key cannot be empty'
      }
      try {
        detectProvider(value.trim())
        return true
      } catch {
        return 'Invalid API key format. Must start with "sk-ant-" (Anthropic) or "sk-" (OpenAI)'
      }
    },
  })

  const trimmedKey = apiKey.trim()
  const provider = detectProvider(trimmedKey)

  await saveAPIKey(trimmedKey)

  success(`API key saved successfully!`)
  info(`Provider: ${provider}`)
  info(`Stored at: ${getConfigPath()}`)

  console.log('\n✨ You can now run: agentbrain init')
}

function maskAPIKey(key: string): string {
  if (key.length <= 8) {
    return '***'
  }
  return key.slice(0, 8) + '...' + key.slice(-4)
}
