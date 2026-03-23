// Git diff → handoff generator

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { AIClient } from '../ai/client.js'
import type { GenerateHandoffOptions, ContextDoc } from '../types.js'

const execAsync = promisify(exec)

/**
 * Get git diff since last commit
 */
async function getGitDiff(repoPath: string): Promise<string> {
  try {
    // Get diff of staged and unstaged changes
    const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: repoPath })
    const { stdout: unstagedDiff } = await execAsync('git diff', { cwd: repoPath })

    const combined = [stagedDiff, unstagedDiff].filter(Boolean).join('\n\n')

    // If no changes, get diff from HEAD
    if (!combined.trim()) {
      const { stdout: headDiff } = await execAsync('git diff HEAD~1..HEAD', { cwd: repoPath })
      return headDiff
    }

    return combined
  } catch {
    return ''
  }
}

/**
 * Get recent commit messages
 */
async function getRecentCommits(repoPath: string, count: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`git log -${count} --oneline`, { cwd: repoPath })
    return stdout
  } catch {
    return ''
  }
}

/**
 * Get current branch name
 */
async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath })
    return stdout.trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get list of modified files
 */
async function getModifiedFiles(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git status --short', { cwd: repoPath })
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => line.trim())
  } catch {
    return []
  }
}

/**
 * Generate handoff document from git diff and context
 */
export async function generateHandoff(
  options: GenerateHandoffOptions
): Promise<{ doc: ContextDoc; tokenCount: number }> {
  const { repoPath, aiConfig, goal, commitCount = 5 } = options
  const client = new AIClient(aiConfig)

  // Gather git information
  const diff = await getGitDiff(repoPath)
  const commits = await getRecentCommits(repoPath, commitCount)
  const branch = await getCurrentBranch(repoPath)
  const modifiedFiles = await getModifiedFiles(repoPath)

  if (!diff && modifiedFiles.length === 0) {
    // No changes detected
    const content = `# Session Handoff

**Branch**: ${branch}
**Generated**: ${new Date().toLocaleString()}

## Status

No changes detected in the working directory.

## Recent Commits

\`\`\`
${commits || 'No commits found'}
\`\`\`

## Next Steps

${goal || 'No specific goals defined for the next session.'}
`

    const doc: ContextDoc = {
      type: 'handoff',
      content,
      generatedAt: new Date().toISOString(),
      gitHash: 'no-changes',
      tokenCount: 0,
    }

    return { doc, tokenCount: 0 }
  }

  // Generate handoff with AI
  const prompt = `You are creating a session handoff document for a coding project to ensure continuity between development sessions.

**Current Branch**: ${branch}

**Modified Files**:
${modifiedFiles.join('\n') || 'None'}

**Recent Commits**:
\`\`\`
${commits}
\`\`\`

**Git Diff**:
\`\`\`diff
${diff.slice(0, 8000)}${diff.length > 8000 ? '\n...(truncated)' : ''}
\`\`\`

${goal ? `**Session Goal**: ${goal}` : ''}

Create a comprehensive handoff document in markdown format with these sections:

## Summary
[Brief overview of what was worked on]

## Changes Made
[List of key changes with file paths]

## Current State
[What's working, what's in progress, what's broken]

## Context & Decisions
[Important decisions made, why certain approaches were chosen]

## Next Steps
[Specific tasks for the next session, prioritized]

## Blockers & Questions
[Any issues or open questions]

Be specific and include file paths. This handoff should allow the next session to continue seamlessly.`

  const response = await client.generate(
    [{ role: 'user', content: prompt }],
    'mid',
    { maxTokens: 3000, temperature: 0.5 }
  )

  const doc: ContextDoc = {
    type: 'handoff',
    content: response.content,
    generatedAt: new Date().toISOString(),
    gitHash: branch, // Use branch name as identifier for handoffs
    tokenCount: response.tokenCount,
  }

  return { doc, tokenCount: response.tokenCount }
}
