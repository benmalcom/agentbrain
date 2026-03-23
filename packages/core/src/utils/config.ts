// API key storage and configuration management

import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import type { AIConfig, AIProvider } from '../types.js'

const CONFIG_DIR = join(homedir(), '.agentbrain')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

interface StoredConfig {
  apiKey?: string
  provider?: AIProvider
}

/**
 * Simple .env file parser (silent, no dependencies)
 * Parses KEY=value or KEY="value" format
 */
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed: Record<string, string> = {}

    for (let line of content.split('\n')) {
      line = line.trim()

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue

      // Parse KEY=value
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (match) {
        const key = match[1]
        let value = match[2].trim()

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        parsed[key] = value
      }
    }

    return parsed
  } catch (error) {
    return {}
  }
}

/**
 * Find git root directory by walking up the tree
 */
function findGitRoot(startPath: string): string | null {
  let currentPath = startPath

  while (currentPath !== dirname(currentPath)) {
    if (existsSync(join(currentPath, '.git'))) {
      return currentPath
    }
    currentPath = dirname(currentPath)
  }

  return null
}

/**
 * Load API key from .env files
 * Checks: .env.local (current dir) → .env (current dir) → .env (git root)
 */
function loadFromDotenv(): { apiKey: string; provider: AIProvider } | null {
  const cwd = process.cwd()
  const gitRoot = findGitRoot(cwd)

  // Priority order of .env files to check
  const envFiles: string[] = [
    join(cwd, '.env.local'),
    join(cwd, '.env'),
  ]

  // Add git root .env if different from current directory
  if (gitRoot && gitRoot !== cwd) {
    envFiles.push(join(gitRoot, '.env.local'))
    envFiles.push(join(gitRoot, '.env'))
  }

  // Try each file in order
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      // Load the .env file (silent - no stdout noise)
      const parsed = parseEnvFile(envFile)

      // Check for Anthropic key first
      if (parsed.ANTHROPIC_API_KEY) {
        return {
          apiKey: parsed.ANTHROPIC_API_KEY,
          provider: 'anthropic',
        }
      }
      // Then check for OpenAI key
      if (parsed.OPENAI_API_KEY) {
        return {
          apiKey: parsed.OPENAI_API_KEY,
          provider: 'openai',
        }
      }
    }
  }

  return null
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
 * Priority:
 * 1. Environment variables (ANTHROPIC_API_KEY / OPENAI_API_KEY)
 * 2. .env.local in current directory
 * 3. .env in current directory
 * 4. .env.local in git root
 * 5. .env in git root
 * 6. ~/.agentbrain/config.json
 */
export async function loadAPIKey(): Promise<{ apiKey: string; provider: AIProvider } | null> {
  // 1. Check environment variables first (highest priority)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (anthropicKey) {
    return { apiKey: anthropicKey, provider: 'anthropic' }
  }
  if (openaiKey) {
    return { apiKey: openaiKey, provider: 'openai' }
  }

  // 2. Check .env files (current dir and git root)
  const dotenvKey = loadFromDotenv()
  if (dotenvKey) {
    return dotenvKey
  }

  // 3. Check stored config (lowest priority)
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
        'No API key found. Options:\n' +
        '  1. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable\n' +
        '  2. Create a .env file with ANTHROPIC_API_KEY or OPENAI_API_KEY\n' +
        '  3. Run "agentbrain config" to store your key in ~/.agentbrain/config.json'
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
