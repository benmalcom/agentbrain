// Task-aware context generation using cached summaries

import { AIClient } from '../ai/client.js'
import { loadCache } from '../cache/index.js'
import type { AIConfig } from '../types.js'

export interface TaskContextOptions {
  repoPath: string
  aiConfig: AIConfig
  task: string
  maxFiles?: number
  onProgress?: (msg: string) => void
}

export interface ScoredFile {
  path: string
  summary: string
  score: number
}

/**
 * Score files for relevance to a specific task using cached summaries
 */
export async function scoreFilesForTask(
  task: string,
  fileSummaries: Array<{ path: string; summary: string }>,
  aiConfig: AIConfig,
  onProgress?: (msg: string) => void
): Promise<ScoredFile[]> {
  const client = new AIClient(aiConfig)

  onProgress?.(`Scoring ${fileSummaries.length} files against task...`)

  // Build prompt with task and all file summaries
  const summariesText = fileSummaries
    .map((f, idx) => `[${idx}] ${f.path}\n${f.summary}`)
    .join('\n\n')

  // For large file counts, chunk the scoring to avoid prompt limits
  // 50 files per chunk balances speed vs AI accuracy (tested with 183 files)
  const CHUNK_SIZE = 50
  const chunks: Array<{ startIdx: number; files: typeof fileSummaries }> = []

  for (let i = 0; i < fileSummaries.length; i += CHUNK_SIZE) {
    chunks.push({
      startIdx: i,
      files: fileSummaries.slice(i, i + CHUNK_SIZE),
    })
  }

  onProgress?.(`Scoring ${fileSummaries.length} files in ${chunks.length} parallel batches...`)

  // Process all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map(async ({ startIdx, files }) => {
      const chunkText = files
        .map((f, idx) => `[${startIdx + idx}] ${f.path}\n${f.summary}`)
        .join('\n\n')

      const prompt = `You are scoring files for relevance to a specific coding task.

TASK: "${task}"

FILES (with summaries):
${chunkText}

For each file, rate its relevance to this task on a scale of 0-10:
- 10 = directly implements or heavily relates to this task
- 7-9 = moderately relevant (supporting code, utilities used)
- 4-6 = tangentially related (might need to understand context)
- 1-3 = minimal relevance (rarely needed)
- 0 = completely irrelevant

Output ONLY a JSON array of ${files.length} scores in the exact order given above. No other text.
Format: [score0, score1, score2, ...]

Example for 3 files: [8, 3, 10]`

      const response = await client.generate(
        [{ role: 'user', content: prompt }],
        'fast',
        { maxTokens: 1000, temperature: 0.3 }
      )

      // Parse scores from response
      let chunkScores: number[]
      try {
        // Extract JSON array from response - try multiple patterns
        let match = response.content.match(/\[[\d,\s]+\]/)
        if (!match) {
          // Try to find numbers separated by commas
          const numbers = response.content.match(/\d+/g)
          if (numbers && numbers.length === files.length) {
            chunkScores = numbers.map((n) => parseInt(n, 10))
          } else {
            throw new Error(
              `No JSON array found. Response: ${response.content.slice(0, 200)}`
            )
          }
        } else {
          chunkScores = JSON.parse(match[0])
        }

        // Validate chunk scores
        if (chunkScores.length !== files.length) {
          throw new Error(
            `Score count mismatch: expected ${files.length}, got ${chunkScores.length}`
          )
        }

        return { startIdx, scores: chunkScores }
      } catch (error) {
        throw new Error(
          `Failed to parse scores for chunk starting at ${startIdx}: ${error}`
        )
      }
    })
  )

  // Combine results in order
  const scores: number[] = new Array(fileSummaries.length)
  for (const { startIdx, scores: chunkScores } of chunkResults) {
    for (let i = 0; i < chunkScores.length; i++) {
      scores[startIdx + i] = chunkScores[i]
    }
  }

  // Validate scores length
  if (scores.length !== fileSummaries.length) {
    throw new Error(
      `Score count mismatch: expected ${fileSummaries.length}, got ${scores.length}`
    )
  }

  // Combine files with their scores
  const scoredFiles: ScoredFile[] = fileSummaries.map((file, idx) => ({
    path: file.path,
    summary: file.summary,
    score: scores[idx] || 0,
  }))

  // Sort by score (highest first)
  return scoredFiles.sort((a, b) => b.score - a.score)
}

/**
 * Generate task-focused context using cached summaries
 */
export async function generateTaskContext(
  options: TaskContextOptions
): Promise<{
  content: string
  selectedFiles: ScoredFile[]
  totalFilesScored: number
  tokens: number
  cost: number
}> {
  const { repoPath, aiConfig, task, maxFiles = 20, onProgress } = options

  onProgress?.('Loading cached file summaries...')

  // Load cache to get existing file summaries
  const cache = await loadCache(repoPath)
  if (!cache || !cache.fileSummaries || cache.fileSummaries.length === 0) {
    throw new Error(
      'No cached summaries found. Run "agentbrain init" first to generate file summaries.'
    )
  }

  const fileSummaries = cache.fileSummaries

  // Score files against task
  const scoredFiles = await scoreFilesForTask(task, fileSummaries, aiConfig, onProgress)

  // Take top N files
  const selectedFiles = scoredFiles.slice(0, maxFiles)

  onProgress?.(`Selected ${selectedFiles.length} most relevant files out of ${fileSummaries.length} total`)

  // Generate focused context document
  const client = new AIClient(aiConfig)

  const filesText = selectedFiles
    .map(
      (f, idx) =>
        `${idx + 1}. **${f.path}** (relevance: ${f.score}/10)\n   ${f.summary}`
    )
    .join('\n\n')

  const contextPrompt = `Create a focused context guide for this specific task.

TASK: "${task}"

RELEVANT FILES (sorted by relevance):
${filesText}

Create a concise context.md that:
1. Lists the exact files needed for this task (with paths)
2. Explains how each file relates to the task
3. Suggests where to start and what order to work in
4. Identifies dependencies between files for this specific task

Focus only on what's needed for THIS TASK. Keep it actionable and specific.

Format as markdown.`

  const response = await client.generate(
    [{ role: 'user', content: contextPrompt }],
    'mid',
    { maxTokens: 2000, temperature: 0.5 }
  )

  // Calculate total tokens (scoring + synthesis)
  const totalTokens = scoredFiles.length * 10 + response.tokenCount // rough estimate for scoring
  const cost = client.calculateCost(totalTokens, 'mid')

  return {
    content: response.content,
    selectedFiles,
    totalFilesScored: fileSummaries.length,
    tokens: totalTokens,
    cost,
  }
}
