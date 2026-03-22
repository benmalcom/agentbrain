# @agentbrain/core

Core intelligence layer for AgentBrain - shared library for repository analysis and AI-powered documentation generation.

## Features

- 🤖 **Provider-agnostic AI client** - Works with both Anthropic (Claude) and OpenAI (GPT)
- 📁 **Intelligent file crawler** - Scans repositories with relevance scoring
- 🧠 **Context generation** - Creates comprehensive codebase documentation
- 📋 **Standards generation** - Generates coding standards for different AI agents
- 🔄 **Handoff generation** - Creates session handoff documents from git diffs
- 💾 **Smart caching** - Git-hash based cache invalidation for zero-cost repeat runs
- 🔐 **Secure config** - Encrypted API key storage with proper permissions

## Installation

```bash
npm install @agentbrain/core
```

## Usage

### Generate Context Documentation

```typescript
import { generateContext, loadAIConfig } from '@agentbrain/core'

const aiConfig = await loadAIConfig()

const result = await generateContext({
  repoPath: '/path/to/repo',
  aiConfig,
  maxFiles: 100,
  useCache: true,
  onProgress: (msg) => console.log(msg),
})

console.log('Generated docs:', result.docs)
console.log('Total tokens:', result.totalTokens)
console.log('Cost:', result.cost)
```

### Scan Repository

```typescript
import { scanRepository } from '@agentbrain/core'

const scanResult = await scanRepository('/path/to/repo', {
  maxFiles: 100,
  onProgress: (msg) => console.log(msg),
})

console.log('Total files:', scanResult.totalFiles)
console.log('Relevant files:', scanResult.relevantFiles.length)
console.log('Git hash:', scanResult.gitHash)
```

### AI Client

```typescript
import { AIClient, loadAIConfig } from '@agentbrain/core'

const config = await loadAIConfig()
const client = new AIClient(config)

const response = await client.generate(
  [{ role: 'user', content: 'Explain this code...' }],
  'mid',  // tier: 'fast' | 'mid' | 'smart'
  { temperature: 0.5, maxTokens: 2000 }
)

console.log(response.content)
console.log('Tokens used:', response.tokenCount)
```

### Cache Management

```typescript
import { loadCache, saveCache, isCacheValid } from '@agentbrain/core'

// Check if cache is valid
const isValid = await isCacheValid('/path/to/repo', currentGitHash)

// Load cache
const cache = await loadCache('/path/to/repo')

// Save to cache
await saveCachedDoc('/path/to/repo', gitHash, doc)
```

## API Reference

### Types

```typescript
type AIProvider = 'anthropic' | 'openai'
type ModelTier = 'fast' | 'mid' | 'smart'

interface AIConfig {
  provider: AIProvider
  apiKey: string
  models: {
    fast: string
    mid: string
    smart: string
  }
}

interface ContextDoc {
  type: 'context' | 'dependency-map' | 'patterns' | 'handoff' | 'standards'
  content: string
  generatedAt: string
  gitHash: string
  tokenCount: number
}
```

### Main Functions

#### `generateContext(options: GenerateContextOptions)`
Generates complete context documentation for a repository.

#### `generateStandards(options: GenerateStandardsOptions)`
Generates coding standards files for AI agents (CLAUDE.md, .cursorrules, .windsurfrules).

#### `generateHandoff(options: GenerateHandoffOptions)`
Generates session handoff document from git diff.

#### `scanRepository(repoPath: string, options?)`
Scans repository and returns relevant files with scoring.

#### `loadAIConfig(apiKeyOverride?: string)`
Loads AI configuration from environment or stored config.

#### `saveAPIKey(apiKey: string)`
Saves API key to secure config file.

## Architecture

### Chunk + Merge Strategy

AgentBrain uses a tiered approach to context generation:

1. **Scan** - Analyze file tree with no AI calls
2. **Score** - Calculate relevance scores for files
3. **Chunk** - Summarize each file independently with fast models
4. **Merge** - Synthesize summaries into comprehensive docs with mid models

This approach:
- ✅ Prevents context overflow
- ✅ Optimizes costs (uses cheap models where possible)
- ✅ Scales to large repositories

### Cache Strategy

Cache is keyed by git commit hash:
- Same hash = instant return (0 tokens)
- Different hash = regenerate
- Cache stored at `{repoPath}/.agentbrain/cache.json`

### File Scoring

Files are scored based on:
- **+100** - Always-include files (README.md, package.json, etc.)
- **+50** - Entry points (index, main, app, server)
- **+30** - Config files
- **-3 per level** - Directory depth penalty
- **-10** - Test files

Files with score < 0 are excluded.

## Configuration

### API Keys

Set via environment variables (highest priority):
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

Or store persistently:
```typescript
import { saveAPIKey } from '@agentbrain/core'
await saveAPIKey('sk-ant-...')
```

Stored at `~/.agentbrain/config.json` with 0600 permissions.

### Model Selection

Default models by provider:

**Anthropic:**
- Fast: `claude-haiku-4-5-20251001`
- Mid: `claude-sonnet-4-6`
- Smart: `claude-opus-4-6`

**OpenAI:**
- Fast: `gpt-4o-mini`
- Mid: `gpt-4o`
- Smart: `gpt-4.1`

## License

MIT

## Related Packages

- [@agentbrain/cli](../cli) - Command-line interface
- [@agentbrain/mcp-server](../mcp-server) - MCP server for Claude Desktop/Cursor/Windsurf
