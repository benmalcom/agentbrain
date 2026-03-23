// Public exports for @agentbrain/core

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
