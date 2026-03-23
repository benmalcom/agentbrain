// Chunk + merge context generator

import { AIClient } from '../ai/client.js'
import { scanRepository, readFileContent } from '../crawler/index.js'
import { getCachedDoc, saveCachedDoc } from '../cache/index.js'
import type { GenerateContextOptions, ContextDoc, FileEntry, CostEstimate } from '../types.js'

/**
 * Summarize a single file using fast model
 */
async function summarizeFile(
  client: AIClient,
  filePath: string,
  content: string,
  language: string
): Promise<{ summary: string; tokens: number }> {
  const prompt = `Analyze this ${language} file and extract SPECIFIC information.

File: ${filePath}

\`\`\`${language.toLowerCase()}
${content.slice(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}
\`\`\`

Output format (be SPECIFIC):
1. **Exports**: List actual function/class/hook/component names (not "provides auth functionality")
2. **Imports**: Key dependencies imported from other files or packages
3. **Purpose**: One sentence what this code does

Example:
Exports: useAuth(), login(), logout() hooks; AuthContext provider
Imports: Privy SDK, React Context API
Purpose: Manages authentication state and Privy wallet connection`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'fast',
    { maxTokens: 500, temperature: 0.3 }
  )

  return {
    summary: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Summarize files in batches with concurrency control
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

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)

    onProgress?.(`Summarizing files ${i + 1}-${Math.min(i + CONCURRENCY, files.length)}...`)

    const results = await Promise.all(
      batch.map(async (file) => {
        const content = await readFileContent(repoPath, file.path)
        if (!content) {
          return { file, summary: 'Unable to read file', tokens: 0 }
        }

        const { summary, tokens } = await summarizeFile(
          client,
          file.path,
          content,
          file.language
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
  const fileSummaries = files
    .map((f) => `### ${f.path}\n${f.summary || 'No summary available'}`)
    .join('\n\n')

  const prompt = `Create a CODE DEPENDENCY MAP showing how modules actually import and use each other.

Here are file summaries with their exports and imports:

${fileSummaries}

Create a dependency-map.md that shows ACTUAL CODE RELATIONSHIPS:

1. **Module Dependencies** - Which files import from which other files?
   - Example: "FlipGame.tsx imports useWallet() from lib/hooks/useWallet.ts"
2. **External Packages** - What npm packages are used and where?
   - Example: "Privy SDK used in: AuthContext, WalletProvider, ProfilePage"
3. **Data Flow** - How does data move between modules? Name specific functions.
   - Example: "User clicks FlipButton → calls placeBet() → updates GameContext → triggers contract call via useFlipContract()"
4. **Entry Points** - List actual entry files (pages, API routes, main.ts)

RULES:
- Show ACTUAL imports, not conceptual relationships
- Use mermaid diagrams for complex flows
- Be specific: name functions, hooks, components
- Focus on CODE dependencies, not file structure

Format as markdown.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'mid',
    { maxTokens: 3000, temperature: 0.5 }
  )

  return {
    content: response.content,
    tokens: response.tokenCount,
  }
}

/**
 * Generate patterns.md from file summaries
 */
async function generatePatterns(
  client: AIClient,
  files: FileEntry[]
): Promise<{ content: string; tokens: number }> {
  const fileSummaries = files
    .map((f) => `### ${f.path}\n${f.summary || 'No summary available'}`)
    .join('\n\n')

  const prompt = `You are identifying coding patterns and conventions in a codebase.

Here are summaries of the files:

${fileSummaries}

Create a patterns.md that documents:
1. Common coding patterns used across the codebase
2. Naming conventions for files, functions, variables
3. Architecture patterns (MVC, layered, microservices, etc.)
4. Error handling patterns
5. Testing patterns
6. Any anti-patterns to avoid

Format as markdown. Be specific and provide examples from the actual code.`

  const response = await client.generate(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'mid',
    { maxTokens: 3000, temperature: 0.5 }
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
  const { repoPath, aiConfig, maxFiles = 100, useCache = true, onProgress } = options

  const client = new AIClient(aiConfig)

  // Scan repository
  const scanResult = await scanRepository(repoPath, { maxFiles, onProgress })

  // Check cache
  if (useCache) {
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

  // Summarize files
  onProgress?.(`Summarizing ${scanResult.relevantFiles.length} files with fast model...`)
  const { files, totalTokens: summaryTokens } = await summarizeFiles(
    client,
    repoPath,
    scanResult.relevantFiles,
    onProgress
  )

  // Generate all context docs in parallel with mid model
  onProgress?.('Generating context docs in parallel...')
  const [contextResult, depMapResult, patternsResult] = await Promise.all([
    generateContextDoc(client, files, repoPath),
    generateDependencyMap(client, files),
    generatePatterns(client, files),
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
