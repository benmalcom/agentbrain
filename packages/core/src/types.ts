// Core types for AgentBrain

export type AIProvider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'mid' | 'smart'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  models: {
    fast: string // claude-haiku-4-5-20251001 / gpt-4o-mini
    mid: string // claude-sonnet-4-6 / gpt-4o
    smart: string // claude-opus-4-6 / gpt-4.1
  }
}

export interface FileEntry {
  path: string // relative to repo root
  size: number // bytes
  language: string // detected from extension
  summary?: string // AI generated (fast model)
}

export interface RepoScanResult {
  root: string
  totalFiles: number
  relevantFiles: FileEntry[]
  gitHash: string // HEAD commit hash — cache key
  scannedAt: string
}

export interface ContextDoc {
  type: 'context' | 'dependency-map' | 'patterns' | 'handoff' | 'standards'
  content: string
  generatedAt: string
  gitHash: string
  tokenCount: number
}

export interface GenerateContextOptions {
  repoPath: string
  aiConfig: AIConfig
  maxFiles?: number
  useCache?: boolean
  onProgress?: (msg: string) => void
}

export interface GenerateStandardsOptions {
  repoPath: string
  aiConfig: AIConfig
  stackAnswers: StackAnswers
  agents: AgentTarget[]
}

export interface GenerateHandoffOptions {
  repoPath: string
  aiConfig: AIConfig
  goal?: string
}

export interface StackAnswers {
  language: string
  framework: string
  testingLib: string
  styleGuide: string
  antiPatterns: string[]
  architectureNotes: string
}

export type AgentTarget = 'claude-code' | 'cursor' | 'windsurf'

export interface StandardsOutput {
  'claude-code'?: string
  cursor?: string
  windsurf?: string
}

export interface CacheEntry {
  gitHash: string
  docs: Partial<Record<ContextDoc['type'], ContextDoc>>
  savedAt: string
}

export interface CostEstimate {
  tokens: number
  usd: number
  breakdown: { label: string; tokens: number }[]
}

// Agent file paths mapping
export const AGENT_FILE_PATHS: Record<AgentTarget, string> = {
  'claude-code': 'CLAUDE.md',
  cursor: '.cursor/rules',
  windsurf: '.windsurfrules',
}
