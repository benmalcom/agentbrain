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
  score: number // relevance score for prioritization
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
  smartCache?: boolean // Reuse file summaries for unchanged files
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
  commitCount?: number // Number of recent commits to include (default: 5)
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
  fileSummaries?: Array<{ path: string; summary: string }> // File summaries for task-aware context
  deepAnalyses?: Record<string, string> // Deep code structure analysis keyed by filePath:gitHash
  savedAt: string
}

export interface CostEstimate {
  tokens: number
  usd: number
  breakdown: { label: string; tokens: number }[]
}

// Agent file paths mapping
// Note: Cursor supports both .cursorrules (modern) and .cursor/rules (legacy)
// We prefer .cursorrules as it's the current standard
export const AGENT_FILE_PATHS: Record<AgentTarget, string> = {
  'claude-code': 'CLAUDE.md', // Claude Code CLI reads this automatically
  cursor: '.cursorrules', // Cursor's modern rules file (also checks .cursor/rules as fallback)
  windsurf: '.windsurfrules', // Windsurf's rules file
}
// Test comment
