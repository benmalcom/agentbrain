// Git hooks installation and management

import { writeFile, chmod } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Check if we're in a git repository
 */
export function isGitRepository(repoPath: string): boolean {
  return existsSync(join(repoPath, '.git'))
}

/**
 * Install post-commit hook for smart auto-regeneration
 * Only regenerates context when source files change (not docs/config)
 */
export async function installPostCommitHook(repoPath: string): Promise<void> {
  if (!isGitRepository(repoPath)) {
    throw new Error('Not a git repository')
  }

  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit')

  // Check if hook already exists
  let existingContent = ''
  if (existsSync(hookPath)) {
    const fs = await import('node:fs/promises')
    existingContent = await fs.readFile(hookPath, 'utf-8')

    // Don't add if already present
    if (existingContent.includes('AgentBrain: Smart auto-regeneration')) {
      return
    }
  }

  const hookContent = `#!/bin/sh
# AgentBrain: Smart auto-regeneration after commits

${existingContent}

# Smart context regeneration - only when source files change
if command -v agentbrain >/dev/null 2>&1; then
  # Get list of changed files in this commit
  CHANGED_FILES=\$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null)

  # Check if any source files changed (not just docs/config)
  if echo "\$CHANGED_FILES" | grep -qE '\\.(ts|js|tsx|jsx|py|go|rs|java|c|cpp|h|hpp|rb|php|swift|kt|cs|scala|r|m|sh|bash|sql|graphql|proto|vue|svelte)\$'; then
    echo "🧠 AgentBrain: Updating context in background..."
    # Run in background and log output (logs to hidden .agentbrain directory)
    mkdir -p .agentbrain
    (agentbrain init --silent --no-confirm > .agentbrain/update.log 2>&1 && echo "✓ Context update complete" || echo "✗ Context update failed") &
    disown
  else
    echo "🧠 AgentBrain: Only docs/config changed, skipping context update"
  fi
fi

exit 0
`

  await writeFile(hookPath, hookContent, 'utf-8')
  await chmod(hookPath, 0o755) // Make executable
}

/**
 * @deprecated Auto-handoff on every commit was too noisy.
 * Use `agentbrain handoff` manually when needed or add [handoff] to commit message.
 * Kept for backwards compatibility but no longer installed by default.
 */
export async function installHandoffHook(repoPath: string): Promise<void> {
  // No-op - deprecated functionality
  // Auto-handoff created too much noise with frequent commits
  return
}

/**
 * Install all AgentBrain git hooks
 * Currently only installs smart context regeneration (not auto-handoff)
 */
export async function installAllHooks(repoPath: string): Promise<{ installed: string[] }> {
  if (!isGitRepository(repoPath)) {
    throw new Error('Not a git repository. Initialize git first: git init')
  }

  const installed: string[] = []

  try {
    await installPostCommitHook(repoPath)
    installed.push('post-commit (smart auto-regeneration)')
  } catch (error) {
    // Continue even if hook installation fails
  }

  // Note: Auto-handoff removed - was too noisy with frequent commits
  // Users should run `agentbrain handoff` manually when needed

  return { installed }
}

/**
 * Remove AgentBrain sections from git hooks
 */
export async function uninstallPostCommitHook(repoPath: string): Promise<boolean> {
  if (!isGitRepository(repoPath)) {
    return false
  }

  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit')

  if (!existsSync(hookPath)) {
    return false
  }

  const fs = await import('node:fs/promises')
  const content = await fs.readFile(hookPath, 'utf-8')

  // Remove AgentBrain section
  const lines = content.split('\n')
  const filteredLines: string[] = []
  let inAgentBrainSection = false

  for (const line of lines) {
    if (line.includes('AgentBrain: Smart auto-regeneration')) {
      inAgentBrainSection = true
      continue
    }
    if (inAgentBrainSection && line.trim() === '') {
      inAgentBrainSection = false
      continue
    }
    if (!inAgentBrainSection) {
      filteredLines.push(line)
    }
  }

  const newContent = filteredLines.join('\n').trim()

  if (newContent === '' || newContent === '#!/bin/sh') {
    // Hook is now empty, delete it
    await fs.unlink(hookPath)
  } else {
    // Hook has other content, write cleaned version
    await writeFile(hookPath, newContent + '\n', 'utf-8')
  }

  return true
}

/**
 * Uninstall all AgentBrain git hooks
 */
export async function uninstallAllHooks(repoPath: string): Promise<{ uninstalled: string[] }> {
  if (!isGitRepository(repoPath)) {
    throw new Error('Not a git repository')
  }

  const uninstalled: string[] = []

  try {
    const removed = await uninstallPostCommitHook(repoPath)
    if (removed) {
      uninstalled.push('post-commit')
    }
  } catch (error) {
    // Continue even if uninstall fails
  }

  return { uninstalled }
}
