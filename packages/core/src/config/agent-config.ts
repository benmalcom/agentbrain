// Agent configuration storage

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentTarget } from '../types.js'

export interface AgentConfig {
  selectedAgents: AgentTarget[]
  setupAt: string
  version: string
}

/**
 * Save selected agents to .agentbrain/config.json
 */
export async function saveAgentConfig(
  repoPath: string,
  selectedAgents: AgentTarget[],
  version: string
): Promise<void> {
  const configDir = join(repoPath, '.agentbrain')
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }

  const config: AgentConfig = {
    selectedAgents,
    setupAt: new Date().toISOString(),
    version,
  }

  const configPath = join(configDir, 'config.json')
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Load agent config from .agentbrain/config.json
 * Returns null if config doesn't exist
 */
export async function loadAgentConfig(
  repoPath: string
): Promise<AgentConfig | null> {
  const configPath = join(repoPath, '.agentbrain', 'config.json')

  if (!existsSync(configPath)) {
    return null
  }

  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content) as AgentConfig
  } catch {
    return null
  }
}
