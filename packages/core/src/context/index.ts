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
  const prompt = `You are analyzing a codebase. Summarize this ${language} file in 2-3 sentences.

File: ${filePath}

\`\`\`${language.toLowerCase()}
${content.slice(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}
\`\`\`

Provide a concise summary focusing on:
1. What this file does
2. Key exports/functions/classes
3. Important dependencies or integrations`

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
  const CONCURRENCY = 5
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

  const prompt = `You are creating a comprehensive context document for a codebase to help a coding agent understand the entire project.

Here are summaries of ${files.length} files from the repository:

${fileSummaries}

Create a well-structured context.md document that:
1. Provides an overview of the project's purpose and architecture
2. Lists key files and their roles
3. Describes the tech stack and frameworks used
4. Explains how different parts of the codebase relate to each other
5. Highlights important patterns or conventions

Format as markdown. Be comprehensive but concise.`

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

  const prompt = `You are creating a dependency map document for a codebase.

Here are summaries of the files:

${fileSummaries}

Create a dependency-map.md that:
1. Shows the relationships between major components/modules
2. Lists external dependencies (npm packages, APIs, etc.)
3. Describes the data flow between components
4. Identifies entry points and how they connect to the rest of the system

Format as markdown with diagrams using mermaid syntax where helpful.`

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

  // Generate context docs with mid model
  onProgress?.('Generating context.md...')
  const contextResult = await generateContextDoc(client, files, repoPath)

  onProgress?.('Generating dependency-map.md...')
  const depMapResult = await generateDependencyMap(client, files)

  onProgress?.('Generating patterns.md...')
  const patternsResult = await generatePatterns(client, files)

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
