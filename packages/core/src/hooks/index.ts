// Git hooks installation and management

import { writeFile, chmod, readFile, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

/**
 * Check if we're in a git repository
 */
export function isGitRepository(repoPath: string): boolean {
  return existsSync(join(repoPath, '.git'))
}

/**
 * Install post-commit hook for smart auto-regeneration
 * Only regenerates context when source files change (not docs/config)
 * Supports Husky and custom git hooksPath
 */
export async function installPostCommitHook(repoPath: string): Promise<void> {
  if (!isGitRepository(repoPath)) {
    throw new Error('Not a git repository')
  }

  // Detect hook installation location (priority: Husky > custom hooksPath > .git/hooks)
  let hookPath: string
  let isHusky = false

  // Check for Husky
  const huskyDir = join(repoPath, '.husky')
  if (existsSync(huskyDir)) {
    hookPath = join(huskyDir, 'post-commit')
    isHusky = true
  } else {
    // Check for custom hooksPath
    try {
      const customHooksPath = execSync('git config core.hooksPath', { cwd: repoPath })
        .toString()
        .trim()
      if (customHooksPath) {
        hookPath = join(repoPath, customHooksPath, 'post-commit')
      } else {
        hookPath = join(repoPath, '.git', 'hooks', 'post-commit')
      }
    } catch {
      hookPath = join(repoPath, '.git', 'hooks', 'post-commit')
    }
  }

  // AgentBrain hook content
  const agentbrainHookContent = `#!/bin/sh
# AgentBrain: Smart auto-regeneration after commits

# Source nvm to get correct PATH on macOS
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh" --no-use

# Find agentbrain binary - check PATH first, then common nvm locations
AGENTBRAIN_PATH=\$(which agentbrain 2>/dev/null)

if [ -z "\$AGENTBRAIN_PATH" ]; then
  for NVM_PATH in \\
    "\$HOME/.nvm/versions/node/v20.19.4/bin/agentbrain" \\
    "\$HOME/.nvm/versions/node/v20.19.3/bin/agentbrain" \\
    "\$HOME/.nvm/versions/node/v20.19.2/bin/agentbrain" \\
    "\$HOME/.nvm/versions/node/v20.19.1/bin/agentbrain" \\
    "\$HOME/.nvm/versions/node/v20.19.0/bin/agentbrain" \\
    "\$HOME/.nvm/versions/node/v22.0.0/bin/agentbrain" \\
    "/usr/local/bin/agentbrain" \\
    "/opt/homebrew/bin/agentbrain"; do
    if [ -f "\$NVM_PATH" ]; then
      AGENTBRAIN_PATH="\$NVM_PATH"
      break
    fi
  done
fi

if [ -z "\$AGENTBRAIN_PATH" ]; then
  exit 0
fi

# Get list of changed files in this commit
CHANGED_FILES=\$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null)

# Check if any source files changed (not just docs/config)
if echo "\$CHANGED_FILES" | grep -qE '\\.(ts|js|tsx|jsx|py|go|rs|java|c|cpp|h|hpp|rb|php|swift|kt|cs|scala|r|m|sh|bash|sql|graphql|proto|vue|svelte)\$'; then
  echo "🧠 AgentBrain: updating context..."

  # Capture absolute paths BEFORE backgrounding
  REPO_PATH=\$(pwd)
  GIT_HASH=\$(git rev-parse --short HEAD)
  TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')

  mkdir -p "\$REPO_PATH/.agentbrain"

  # Write STARTED entry immediately
  echo "\$TIMESTAMP | Git: \$GIT_HASH | STARTED" >> "\$REPO_PATH/.agentbrain/update.log"

  # Context update (background, non-blocking)
  nohup sh -c "
    START_TIME=\\\$(date +%s)
    if \$AGENTBRAIN_PATH init --silent --no-confirm >> \$REPO_PATH/.agentbrain/update.log 2>&1; then
      END_TIME=\\\$(date +%s)
      DURATION=\\\$((END_TIME - START_TIME))
      echo \\\"\\\$(date '+%Y-%m-%d %H:%M:%S') | Git: \$GIT_HASH | SUCCESS | \\\${DURATION}s\\\" >> \$REPO_PATH/.agentbrain/update.log
    else
      END_TIME=\\\$(date +%s)
      DURATION=\\\$((END_TIME - START_TIME))
      echo \\\"\\\$(date '+%Y-%m-%d %H:%M:%S') | Git: \$GIT_HASH | FAILED | \\\${DURATION}s\\\" >> \$REPO_PATH/.agentbrain/update.log
    fi
  " > /dev/null 2>&1 &

  # Doom loop detection (background, non-blocking)
  nohup sh -c "
    sleep 0.5
    DOOM_RESULT=\\\$(\$AGENTBRAIN_PATH doom --json --path \$REPO_PATH 2>/dev/null)
    if echo \\\"\\\$DOOM_RESULT\\\" | grep -q detected.*true; then
      echo
      echo \\\"⚠  AgentBrain: possible doom loop detected\\\"
      echo
      FILES=\\\$(echo \\\"\\\$DOOM_RESULT\\\" | grep -o \\\"path\\\":\\\"[^\\\"]*\\\" | sed s/\\\"path\\\":\\\"//\\;s/\\\"//)
      if [ ! -z \\\"\\\$FILES\\\" ]; then
        echo \\\"These files are being modified repeatedly:\\\"
        echo \\\"\\\$FILES\\\" | while IFS= read -r file; do
          echo \\\"  - \\\$file\\\"
        done
        echo
        echo \\\"Suggestions:\\\"
        echo \\\"  → Stop coding. Investigate root cause first.\\\"
        echo \\\"  → Run: agentbrain spec to plan your fix\\\"
        echo
      fi
    fi
  " > /dev/null 2>&1 &
else
  echo "🧠 AgentBrain: only docs changed, skipping"
fi

exit 0
`

  // Install hook - always overwrite to ensure latest version
  // This ensures broken hooks get fixed on reinstall
  await writeFile(hookPath, agentbrainHookContent, 'utf-8')
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

  // Detect hook location (same logic as install)
  let hookPath: string
  const huskyDir = join(repoPath, '.husky')

  if (existsSync(huskyDir)) {
    hookPath = join(huskyDir, 'post-commit')
  } else {
    try {
      const customHooksPath = execSync('git config core.hooksPath', { cwd: repoPath })
        .toString()
        .trim()
      if (customHooksPath) {
        hookPath = join(repoPath, customHooksPath, 'post-commit')
      } else {
        hookPath = join(repoPath, '.git', 'hooks', 'post-commit')
      }
    } catch {
      hookPath = join(repoPath, '.git', 'hooks', 'post-commit')
    }
  }

  if (!existsSync(hookPath)) {
    return false
  }

  const fs = await import('node:fs/promises')
  const content = await fs.readFile(hookPath, 'utf-8')

  // If entire file is AgentBrain content, just delete it
  if (content.includes('AgentBrain: Smart auto-regeneration') && !content.includes('husky')) {
    await fs.unlink(hookPath)
    return true
  }

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

  if (newContent === '' || newContent === '#!/bin/sh' || newContent === '#!/usr/bin/env sh') {
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
