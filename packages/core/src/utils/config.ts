// API key storage and configuration management

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { AIConfig, AIProvider } from '../types.js'

const CONFIG_DIR = join(homedir(), '.agentbrain')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

interface StoredConfig {
  apiKey?: string
  provider?: AIProvider
}

/**
 * Detect AI provider from API key prefix
 */
export function detectProvider(apiKey: string): AIProvider {
  if (apiKey.startsWith('sk-ant-')) {
    return 'anthropic'
  }
  if (apiKey.startsWith('sk-')) {
    return 'openai'
  }
  throw new Error(
    'Unable to detect provider from API key. Key must start with "sk-ant-" (Anthropic) or "sk-" (OpenAI)'
  )
}

/**
 * Get default models for a provider
 */
export function getDefaultModels(provider: AIProvider) {
  if (provider === 'anthropic') {
    return {
      fast: 'claude-haiku-4-5-20251001',
      mid: 'claude-sonnet-4-6',
      smart: 'claude-opus-4-6',
    }
  } else {
    return {
      fast: 'gpt-4o-mini',
      mid: 'gpt-4o',
      smart: 'gpt-4.1',
    }
  }
}

/**
 * Load API key from environment or stored config
 * Priority: ANTHROPIC_API_KEY / OPENAI_API_KEY env vars > stored config
 */
export async function loadAPIKey(): Promise<{ apiKey: string; provider: AIProvider } | null> {
  // Check environment variables first
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (anthropicKey) {
    return { apiKey: anthropicKey, provider: 'anthropic' }
  }
  if (openaiKey) {
    return { apiKey: openaiKey, provider: 'openai' }
  }

  // Check stored config
  if (!existsSync(CONFIG_FILE)) {
    return null
  }

  try {
    const content = await readFile(CONFIG_FILE, 'utf-8')
    const config: StoredConfig = JSON.parse(content)

    if (config.apiKey && config.provider) {
      return { apiKey: config.apiKey, provider: config.provider }
    }
  } catch (error) {
    // Invalid config file, return null
    return null
  }

  return null
}

/**
 * Save API key to config file with secure permissions
 */
export async function saveAPIKey(apiKey: string): Promise<void> {
  const provider = detectProvider(apiKey)

  // Ensure config directory exists with restricted permissions
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 })
  } else {
    await chmod(CONFIG_DIR, 0o700)
  }

  const config: StoredConfig = {
    apiKey,
    provider,
  }

  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
  await chmod(CONFIG_FILE, 0o600)
}

/**
 * Load full AI configuration
 */
export async function loadAIConfig(apiKeyOverride?: string): Promise<AIConfig> {
  let apiKey: string
  let provider: AIProvider

  if (apiKeyOverride) {
    apiKey = apiKeyOverride
    provider = detectProvider(apiKey)
  } else {
    const loaded = await loadAPIKey()
    if (!loaded) {
      throw new Error(
        'No API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable, or run "agentbrain config" to store your key.'
      )
    }
    apiKey = loaded.apiKey
    provider = loaded.provider
  }

  return {
    provider,
    apiKey,
    models: getDefaultModels(provider),
  }
}

/**
 * Get the stored config file path (for display purposes)
 */
export function getConfigPath(): string {
  return CONFIG_FILE
}
