// Chunk + merge context generator

import { AIClient } from '../ai/client.js'
import { scanRepository, readFileContent } from '../crawler/index.js'
import { getCachedDoc, saveCachedDoc } from '../cache/index.js'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { GenerateContextOptions, ContextDoc, FileEntry, CostEstimate } from '../types.js'

const execAsync = promisify(exec)

/**
 * Get list of changed files from git diff since last commit
 */
async function getChangedFiles(repoPath: string): Promise<Set<string>> {
  try {
    // Get files changed in the last commit
    const { stdout } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD', {
      cwd: repoPath,
    })
    const files = stdout.trim().split('\n').filter(Boolean)
    return new Set(files)
  } catch {
    // If git command fails, return empty set (will trigger full regeneration)
    return new Set()
  }
}

/**
 * Extract export statements from code
 */
function extractExports(content: string, language: string): string {
  const lines = content.split('\n')
  const exportLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match various export patterns
    if (
      trimmed.startsWith('export ') ||
      trimmed.startsWith('exports.') ||
      trimmed.startsWith('module.exports') ||
      (language === 'python' && trimmed.startsWith('def ') && !trimmed.startsWith('    ')) ||
      (language === 'python' && trimmed.startsWith('class ') && !trimmed.startsWith('    '))
    ) {
      exportLines.push(line)
    }
  }

  return exportLines.join('\n')
}

/**
 * Smart file truncation based on file size
 */
function smartTruncate(content: string, language: string): { content: string; truncated: boolean } {
  const lines = content.split('\n')
  const lineCount = lines.length

  // Small files: full content
  if (lineCount <= 200) {
    return { content, truncated: false }
  }

  // Medium files (200-500 lines): first 150 lines + exports
  if (lineCount <= 500) {
    const firstPart = lines.slice(0, 150).join('\n')
    const exports = extractExports(content, language)
    return {
      content: `${firstPart}\n\n// ... (middle section truncated) ...\n\n// Exports:\n${exports}`,
      truncated: true,
    }
  }

  // Large files (>500 lines): first 100 lines + exports
  const firstPart = lines.slice(0, 100).join('\n')
  const exports = extractExports(content, language)
  return {
    content: `${firstPart}\n\n// ... (large file truncated) ...\n\n// Exports:\n${exports}`,
    truncated: true,
  }
}

/**
 * Summarize a single file using fast model
 */
async function summarizeFile(
  client: AIClient,
  filePath: string,
  content: string,
  language: string,
  tier: 'deep' | 'brief' = 'brief'
): Promise<{ summary: string; tokens: number }> {
  // Smart truncation
  const { content: truncatedContent, truncated } = smartTruncate(content, language)

  // Different prompts for different tiers
  const prompt =
    tier === 'deep'
      ? `Analyze this ${language} file and extract SPECIFIC information.

File: ${filePath}

\`\`\`${language.toLowerCase()}
${truncatedContent.slice(0, 6000)}${truncated || truncatedContent.length > 6000 ? ' ...(truncated)' : ''}
\`\`\`

Output format (be SPECIFIC):
1. **Exports**: List actual function/class/hook/component names
2. **Imports**: Key dependencies imported from other files or packages
3. **Purpose**: One sentence what this code does

Example:
Exports: useAuth(), login(), logout() hooks; AuthContext provider
Imports: Privy SDK, React Context API
Purpose: Manages authentication state and Privy wallet connection`
      : `What does this ${language} file export and what is its single responsibility?

File: ${filePath}

\`\`\`${language.toLowerCase()}
${truncatedContent.slice(0, 3000)}${truncated || truncatedContent.length > 3000 ? ' ...(truncated)' : ''}
\`\`\`

Answer in max 50 words: what it exports and what it does.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'fast',
    { maxTokens: tier === 'deep' ? 500 : 150, temperature: 0.3 }
  )

  return {
    summary: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Summarize files in batches with concurrency control and two-tier approach
 */
async function summarizeFiles(
  client: AIClient,
  repoPath: string,
  files: FileEntry[],
  onProgress?: (msg: string) => void
): Promise<{ files: FileEntry[]; totalTokens: number }> {
  const CONCURRENCY = 10
  const summarizedFiles: FileEntry[] = []
  let totalTokens = 0

  // Sort files by score (descending) to identify top tier
  const sortedFiles = [...files].sort((a, b) => b.score - a.score)

  // Top 20 files get deep summaries, rest get brief
  const deepTierCount = Math.min(20, Math.floor(files.length * 0.2))

  for (let i = 0; i < sortedFiles.length; i += CONCURRENCY) {
    const batch = sortedFiles.slice(i, i + CONCURRENCY)

    const tier = i < deepTierCount ? 'deep' : 'brief'
    onProgress?.(
      `Summarizing files ${i + 1}-${Math.min(i + CONCURRENCY, sortedFiles.length)} (${tier} tier)...`
    )

    const results = await Promise.all(
      batch.map(async (file, batchIndex) => {
        const content = await readFileContent(repoPath, file.path)
        if (!content) {
          return { file, summary: 'Unable to read file', tokens: 0 }
        }

        // Determine tier for this specific file
        const globalIndex = i + batchIndex
        const fileTier = globalIndex < deepTierCount ? 'deep' : 'brief'

        const { summary, tokens } = await summarizeFile(
          client,
          file.path,
          content,
          file.language,
          fileTier
        )
        return { file: { ...file, summary }, summary, tokens }
      })
    )

    for (const result of results) {
      summarizedFiles.push(result.file)
      totalTokens += result.tokens
    }
  }

  return { files: summarizedFiles, totalTokens }
}

/**
 * Generate context.md from file summaries
 */
async function generateContextDoc(
  client: AIClient,
  files: FileEntry[],
  repoPath: string
): Promise<{ content: string; tokens: number }> {
  const fileSummaries = files
    .map((f) => `### ${f.path} (${f.language})\n${f.summary || 'No summary available'}`)
    .join('\n\n')

  const prompt = `You are creating a NAVIGATION GUIDE for a coding agent working in this codebase.

The agent needs to answer: "Where is the code that does X?"

Here are summaries of ${files.length} files from the repository:

${fileSummaries}

Create a context.md that helps the agent LOCATE code quickly:

## Format Requirements:
1. **Feature Areas** - Group by actual features (auth, payments, game logic, etc.)
2. **Exact File Paths** - For each feature, list the SPECIFIC files that implement it
3. **Key Exports** - Name the actual functions/classes/hooks by name (not "provides functionality")
4. **Entry Points** - Where does execution start for this feature?

## Rules:
- NO generic descriptions like "handles user authentication"
- YES specific paths like "apps/frontend/src/lib/auth/session.ts exports useSession() hook"
- NO "there are components for X"
- YES "FlipCard component in apps/frontend/src/components/game/FlipCard.tsx"
- Focus on WHERE code lives, not WHAT it does conceptually

Example output format:
### Authentication
- **Entry**: apps/frontend/src/lib/auth/index.ts
- **Session Management**: useSession() hook in src/lib/auth/session.ts
- **Privy Integration**: PrivyProvider setup in src/contexts/AuthContext.tsx
- **Protected Routes**: withAuth() HOC in src/lib/auth/withAuth.tsx

Format as markdown. Be SPECIFIC with file paths and export names.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'mid',
    { maxTokens: 4096, temperature: 0.5 }
  )

  return {
    content: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Generate dependency-map.md from file summaries
 */
async function generateDependencyMap(
  client: AIClient,
  files: FileEntry[]
): Promise<{ content: string; tokens: number }> {
  // Filter out README.md files - they are documentation, not import sources
  const codeFiles = files.filter((f) => !f.path.toLowerCase().endsWith('readme.md'))

  const fileSummaries = codeFiles
    .map((f) => `### ${f.path}\n${f.summary || 'No summary available'}`)
    .join('\n\n')

  const prompt = `Create a COMPLETE dependency map with mermaid diagrams showing how modules import and use each other.

Here are file summaries with their exports and imports:

${fileSummaries}

CRITICAL REQUIREMENTS:

## 1. Module Architecture Diagram
Create a mermaid graph showing which modules/files import from which:
- Use REAL file paths from the summaries above (e.g., "src/auth/session.ts")
- Show actual import relationships between files
- Group related modules visually

\`\`\`mermaid
graph TD
  A[src/auth/session.ts] --> B[src/contexts/AuthContext.tsx]
  B --> C[src/pages/Profile.tsx]
\`\`\`

## 2. Complete Request Lifecycle
Create a mermaid sequence diagram showing the FULL flow of a user request:
- From user action → controller/page → service → database → response
- Use REAL component/function/service names from the codebase
- Show every step, not placeholders

\`\`\`mermaid
sequenceDiagram
  User->>FlipButton: Click
  FlipButton->>placeBet(): Call
  placeBet()->>GameContext: Update state
  GameContext->>useFlipContract(): Trigger transaction
  useFlipContract()->>Blockchain: Send tx
  Blockchain-->>FlipButton: Result
\`\`\`

## 3. Feature-Specific Flows (minimum 2)
Identify the 2 most important features in the codebase and create mermaid diagrams for each:
- Use actual file paths and function names
- Show complete data flow from trigger to result
- Examples: authentication flow, payment flow, data sync flow, etc.

## 4. External Dependencies Table
List external packages with WHERE they're actually used:

| Package | Used In (file paths) | Purpose |
|---------|---------------------|---------|
| Privy SDK | src/contexts/AuthContext.tsx, src/hooks/useWallet.ts | Wallet authentication |

STRICT RULES:
- NEVER use placeholder names like "Module A" or "Service X"
- ALWAYS use real file paths from the summaries above
- Generate diagrams for ALL flows (Module Architecture + Request Lifecycle + 2+ Feature Flows)
- If you cannot find real names, write "Unable to determine from provided summaries"
- IGNORE any README.md files - they are documentation, not code

Format as markdown with proper mermaid code blocks.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'mid',
    { maxTokens: 4000, temperature: 0.5 }
  )

  return {
    content: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Generate patterns.md from ACTUAL CODE (not summaries)
 */
async function generatePatterns(
  client: AIClient,
  repoPath: string,
  files: FileEntry[]
): Promise<{ content: string; tokens: number }> {
  // Filter out index.ts files and package.json - they don't contain implementation patterns
  // Prioritize actual implementation files: controllers, services, guards, DTOs, etc.
  const implementationFiles = files.filter(f => {
    const path = f.path.toLowerCase()
    const filename = path.split('/').pop() || ''

    // Exclude index files and package.json
    if (filename === 'index.ts' || filename === 'index.js' || filename === 'package.json') {
      return false
    }

    // Prioritize files with implementation patterns in their names
    const hasImplementationPattern = [
      '.controller.', '.service.', '.resolver.', '.dto.',
      '.guard.', '.middleware.', '.decorator.', '.filter.',
      '.pipe.', '.interceptor.', '.entity.', '.model.'
    ].some(pattern => path.includes(pattern))

    return hasImplementationPattern || f.score > 50 // Include high-scoring non-pattern files too
  })

  // Take top 12 implementation files (increased from 8 to get better coverage)
  const topFiles = implementationFiles
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)

  const fileContents: string[] = []
  for (const file of topFiles) {
    const content = await readFileContent(repoPath, file.path)
    if (content) {
      const lines = content.split('\n')
      const truncated = lines.slice(0, 200).join('\n')
      const truncationNote = lines.length > 200 ? `\n// ... (truncated at 200 lines)` : ''
      fileContents.push(`### ${file.path} (${file.language})\n\`\`\`${file.language.toLowerCase()}\n${truncated}${truncationNote}\n\`\`\``)
    }
  }

  const actualCode = fileContents.join('\n\n')

  const prompt = `You are extracting REAL coding patterns from a codebase by analyzing ACTUAL CODE.

Here is the actual code from the top 8 most important files (up to 200 lines each):

${actualCode}

CREATE a patterns.md that shows an agent HOW TO CODE in this specific codebase.

CRITICAL REQUIREMENT: Every pattern MUST include a REAL CODE EXAMPLE copied from the files above.
If you cannot find a real example in the code provided, SKIP that pattern entirely.

## Required Sections (with real code examples):

### 1. How to Create a New Module
Find a real module file from the code above and show it as a template:
\`\`\`typescript
// From [actual file path]
[20-40 lines of real code showing module structure]
\`\`\`
**When to use**: Use this pattern when adding a new [feature/service/etc]

### 2. How to Create a Service/Class
Find a real service/class constructor pattern:
\`\`\`typescript
// From [actual file path]
[real constructor with dependencies, decorators, etc]
\`\`\`
**When to use**: Use this when [specific scenario]

### 3. DTO/Data Structure Patterns
Show a real DTO or data interface:
\`\`\`typescript
// From [actual file path]
[real DTO with decorators/validation]
\`\`\`
**When to use**: Follow this structure when [scenario]

### 4. Error Handling
Show how errors are actually thrown in THIS codebase:
\`\`\`typescript
// From [actual file path]
[real error throwing code]
\`\`\`
**When to use**: Use this pattern when [scenario]

### 5. Guards/Middleware/Decorators
Show real guard/middleware usage:
\`\`\`typescript
// From [actual file path]
[real decorator/guard usage]
\`\`\`

### 6. Naming Conventions
Extract REAL naming patterns from the actual files provided:
- **Files**: [real examples from file paths above]
- **Functions**: [real function names from code above]
- **Variables**: [real variable names from code above]
- **Classes**: [real class names from code above]

### 7. Anti-Patterns Found
Look at the actual code and identify anything that shouldn't be replicated:
- [specific anti-pattern found in the code with line reference]
- Why to avoid: [explanation]

STRICT RULES:
1. DO NOT write generic framework documentation
2. DO NOT describe patterns conceptually - show REAL CODE
3. Every code example must be 20-40 lines from the actual files provided above
4. Include the source file path in every code block comment
5. If you cannot find a real example for a section, write "No clear pattern found in provided files" and skip it
6. Focus on making it ACTIONABLE: "When adding X, copy this pattern from Y"

Format as markdown with proper syntax highlighting.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'mid',
    { maxTokens: 4000, temperature: 0.5 }
  )

  return {
    content: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Generate all context documents (context, dependency-map, patterns)
 */
export async function generateContext(
  options: GenerateContextOptions
): Promise<{ docs: ContextDoc[]; totalTokens: number; cost: number }> {
  const { repoPath, aiConfig, maxFiles = 100, useCache = true, smartCache = false, onProgress } = options

  const client = new AIClient(aiConfig)

  // Scan repository
  const scanResult = await scanRepository(repoPath, { maxFiles, onProgress })

  // Check full cache (git hash match)
  if (useCache && !smartCache) {
    const cachedContext = await getCachedDoc(repoPath, scanResult.gitHash, 'context')
    const cachedDepMap = await getCachedDoc(repoPath, scanResult.gitHash, 'dependency-map')
    const cachedPatterns = await getCachedDoc(repoPath, scanResult.gitHash, 'patterns')

    if (cachedContext && cachedDepMap && cachedPatterns) {
      onProgress?.('Using cached context docs (0 tokens spent)')
      return {
        docs: [cachedContext, cachedDepMap, cachedPatterns],
        totalTokens: 0,
        cost: 0,
      }
    }
  }

  // Smart cache: reuse file summaries for unchanged files
  let files: FileEntry[]
  let summaryTokens = 0

  if (smartCache) {
    const { loadCache } = await import('../cache/index.js')
    const existingCache = await loadCache(repoPath)

    if (existingCache?.fileSummaries && existingCache.fileSummaries.length > 0) {
      onProgress?.('Smart cache: checking for changed files...')

      // Get changed files from git diff
      const changedFiles = await getChangedFiles(repoPath)

      // Build map of existing summaries
      const summaryMap = new Map(existingCache.fileSummaries.map(f => [f.path, f.summary]))

      // Separate changed and unchanged files
      const changedFileEntries: FileEntry[] = []
      const unchangedFileEntries: FileEntry[] = []

      for (const file of scanResult.relevantFiles) {
        if (changedFiles.has(file.path) || !summaryMap.has(file.path)) {
          changedFileEntries.push(file)
        } else {
          // Reuse cached summary
          unchangedFileEntries.push({
            ...file,
            summary: summaryMap.get(file.path),
          })
        }
      }

      // Only summarize changed files
      if (changedFileEntries.length > 0) {
        onProgress?.(`Smart cache: summarizing ${changedFileEntries.length} changed files (${unchangedFileEntries.length} cached)...`)
        const { files: newFiles, totalTokens: newTokens } = await summarizeFiles(
          client,
          repoPath,
          changedFileEntries,
          onProgress
        )

        // Merge with cached summaries
        files = [...newFiles, ...unchangedFileEntries]
        summaryTokens = newTokens
      } else {
        onProgress?.('Smart cache: no files changed, using all cached summaries')
        files = unchangedFileEntries
        summaryTokens = 0
      }
    } else {
      // No existing summaries, do full scan
      onProgress?.(`Summarizing ${scanResult.relevantFiles.length} files with fast model...`)
      const result = await summarizeFiles(client, repoPath, scanResult.relevantFiles, onProgress)
      files = result.files
      summaryTokens = result.totalTokens
    }
  } else {
    // Normal mode: summarize all files
    onProgress?.(`Summarizing ${scanResult.relevantFiles.length} files with fast model...`)
    const result = await summarizeFiles(client, repoPath, scanResult.relevantFiles, onProgress)
    files = result.files
    summaryTokens = result.totalTokens
  }

  // Generate all context docs in parallel with mid model
  onProgress?.('Generating context docs in parallel...')
  const [contextResult, depMapResult, patternsResult] = await Promise.all([
    generateContextDoc(client, files, repoPath),
    generateDependencyMap(client, files),
    generatePatterns(client, repoPath, files),
  ])

  const totalTokens = summaryTokens + contextResult.tokens + depMapResult.tokens + patternsResult.tokens
  const cost = client.calculateCost(totalTokens, 'mid') // Rough estimate

  // Create doc objects
  const now = new Date().toISOString()
  const docs: ContextDoc[] = [
    {
      type: 'context',
      content: contextResult.content,
      generatedAt: now,
      gitHash: scanResult.gitHash,
      tokenCount: contextResult.tokens,
    },
    {
      type: 'dependency-map',
      content: depMapResult.content,
      generatedAt: now,
      gitHash: scanResult.gitHash,
      tokenCount: depMapResult.tokens,
    },
    {
      type: 'patterns',
      content: patternsResult.content,
      generatedAt: now,
      gitHash: scanResult.gitHash,
      tokenCount: patternsResult.tokens,
    },
  ]

  // Save to cache
  for (const doc of docs) {
    await saveCachedDoc(repoPath, scanResult.gitHash, doc)
  }

  // Save file summaries for task-aware context
  const { saveCache, loadCache } = await import('../cache/index.js')
  let cache = await loadCache(repoPath)
  if (!cache || cache.gitHash !== scanResult.gitHash) {
    cache = {
      gitHash: scanResult.gitHash,
      docs: {},
      savedAt: new Date().toISOString(),
    }
  }
  cache.fileSummaries = files.map((f) => ({
    path: f.path,
    summary: f.summary || '',
  }))
  await saveCache(repoPath, cache)

  onProgress?.('Context generation complete!')

  return { docs, totalTokens, cost }
}

/**
 * Estimate cost before generating
 */
export async function estimateContextCost(
  repoPath: string,
  aiConfig: GenerateContextOptions['aiConfig'],
  maxFiles?: number
): Promise<CostEstimate> {
  const client = new AIClient(aiConfig)

  // Quick scan to estimate
  const scanResult = await scanRepository(repoPath, { maxFiles })

  // Estimate tokens
  const avgFileSize = 500 // average tokens per file summary
  const summaryTokens = scanResult.relevantFiles.length * avgFileSize

  const contextTokens = 5000 // estimated
  const depMapTokens = 3000
  const patternsTokens = 3000

  const totalTokens = summaryTokens + contextTokens + depMapTokens + patternsTokens

  const breakdown = [
    { label: `File summaries (${scanResult.relevantFiles.length} files × fast model)`, tokens: summaryTokens },
    { label: 'Context synthesis (mid model)', tokens: contextTokens },
    { label: 'Dependency map (mid model)', tokens: depMapTokens },
    { label: 'Patterns analysis (mid model)', tokens: patternsTokens },
  ]

  return {
    tokens: totalTokens,
    usd: client.calculateCost(totalTokens, 'mid'),
    breakdown,
  }
}
