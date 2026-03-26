// Public exports for @agentbrain/core
// v1.4.0 - Background updates, disable command, large repo support

// Types
export * from './types.js'

// AI Client
export { AIClient } from './ai/client.js'
export type { AIMessage, AIResponse } from './ai/client.js'

// Crawler
export {
  scanRepository,
  readFileContent,
  detectLanguage,
  calculateRelevanceScore,
  getGitHash,
} from './crawler/index.js'

// Cache
export {
  loadCache,
  saveCache,
  isCacheValid,
  getCachedDoc,
  saveCachedDoc,
  invalidateCache,
} from './cache/index.js'

// Config utilities
export {
  loadAPIKey,
  saveAPIKey,
  loadAIConfig,
  detectProvider,
  getDefaultModels,
  getConfigPath,
} from './utils/config.js'

// Context generation
export { generateContext, estimateContextCost } from './context/index.js'

// Standards generation
export { generateStandards } from './standards/index.js'

// Spec generation
export { createSpec, generateSpec, saveSpec, loadSpec, listSpecs, injectSpecReference } from './spec/index.js'
export type { SpecAnswers, GenerateSpecResult } from './spec/index.js'

// Handoff generation
export { generateHandoff } from './handoff/index.js'

// Agent file injection
export { detectAgents, injectIntoAgentFile, injectIntoAllAgents } from './agent-inject/index.js'

// Git hooks
export {
  isGitRepository,
  installPostCommitHook,
  installHandoffHook,
  installAllHooks,
  uninstallPostCommitHook,
  uninstallAllHooks,
} from './hooks/index.js'

// Diagnostics
export { runDiagnostics } from './doctor/index.js'
export type { DoctorCheck, DoctorResult } from './doctor/index.js'

// Agent configuration
export { saveAgentConfig, loadAgentConfig } from './config/agent-config.js'
export type { AgentConfig } from './config/agent-config.js'

// Doom loop detection
export { analyzeDoomLoop, checkPendingDoomWarning, getPendingDoomForMCP } from './doom/index.js'
export type { DoomFile, DoomLoopResult, DoomWarningForMCP } from './doom/index.js'
