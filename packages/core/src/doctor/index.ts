// Diagnostic checks for AgentBrain setup

import { existsSync } from 'node:fs'
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { constants } from 'node:fs'
import { loadAPIKey, detectProvider } from '../utils/config.js'
import { getGitHash } from '../crawler/index.js'
import { loadCache } from '../cache/index.js'
import { AGENT_FILE_PATHS } from '../types.js'
import type { AgentTarget } from '../types.js'

export interface DoctorCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  fix?: string
}

export interface DoctorResult {
  checks: DoctorCheck[]
  score: { passed: number; total: number }
}

/**
 * Run all diagnostic checks
 */
export async function runDiagnostics(repoPath: string): Promise<DoctorResult> {
  // Run all checks in parallel for maximum performance
  const [
    apiKeyCheck,
    gitRepoCheck,
    contextFilesCheck,
    cacheValidCheck,
    gitHookCheck,
    hookLogCheck,
    agentChecks,
    contextFreshnessCheck,
    fileScanCheck,
  ] = await Promise.all([
    checkAPIKey(),
    checkGitRepository(repoPath),
    checkContextFiles(repoPath),
    checkCacheValid(repoPath),
    checkGitHook(repoPath),
    checkHookLog(repoPath),
    checkAgentFiles(repoPath),
    checkContextFreshness(repoPath),
    checkFileScanSanity(repoPath),
  ])

  const checks: DoctorCheck[] = [
    apiKeyCheck,
    gitRepoCheck,
    contextFilesCheck,
    cacheValidCheck,
    gitHookCheck,
    hookLogCheck,
    ...agentChecks,
    contextFreshnessCheck,
    fileScanCheck,
  ]

  const passed = checks.filter((c) => c.status === 'pass').length
  const total = checks.length

  return {
    checks,
    score: { passed, total },
  }
}

async function checkAPIKey(): Promise<DoctorCheck> {
  try {
    const result = await loadAPIKey()
    if (!result) {
      return {
        name: 'api_key',
        status: 'fail',
        message: 'no key found',
        fix: 'agentbrain config',
      }
    }

    const { apiKey, provider } = result
    const masked = apiKey.slice(0, 6) + '...' + apiKey.slice(-4)

    return {
      name: 'api_key',
      status: 'pass',
      message: `${provider} · ${masked}`,
    }
  } catch {
    return {
      name: 'api_key',
      status: 'fail',
      message: 'no key found',
      fix: 'agentbrain config',
    }
  }
}

async function checkGitRepository(repoPath: string): Promise<DoctorCheck> {
  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    return {
      name: 'git_repository',
      status: 'fail',
      message: 'not a git repo',
      fix: 'git init',
    }
  }

  try {
    const hash = await getGitHash(repoPath)
    const shortHash = hash.slice(0, 7)
    return {
      name: 'git_repository',
      status: 'pass',
      message: `yes · HEAD: ${shortHash}`,
    }
  } catch {
    return {
      name: 'git_repository',
      status: 'warn',
      message: 'git directory found but cannot read HEAD',
    }
  }
}

async function checkContextFiles(repoPath: string): Promise<DoctorCheck> {
  const contextDir = join(repoPath, 'agentbrain')
  const files = ['context.md', 'dependency-map.md', 'patterns.md']

  const existing = files.filter((f) => existsSync(join(contextDir, f)))

  if (existing.length === 0) {
    return {
      name: 'context_files',
      status: 'fail',
      message: 'no context files found',
      fix: 'agentbrain init',
    }
  }

  if (existing.length < files.length) {
    const missing = files.filter((f) => !existing.includes(f))
    return {
      name: 'context_files',
      status: 'warn',
      message: `${missing.join(', ')} missing`,
      fix: 'agentbrain init',
    }
  }

  return {
    name: 'context_files',
    status: 'pass',
    message: `${existing.length} files`,
  }
}

async function checkCacheValid(repoPath: string): Promise<DoctorCheck> {
  try {
    const cache = await loadCache(repoPath)
    if (!cache) {
      return {
        name: 'cache_valid',
        status: 'fail',
        message: 'no cache found',
        fix: 'agentbrain init',
      }
    }

    const currentHash = await getGitHash(repoPath)
    if (cache.gitHash !== currentHash) {
      return {
        name: 'cache_valid',
        status: 'warn',
        message: 'cache stale (git hash mismatch)',
        fix: 'agentbrain init --no-cache',
      }
    }

    return {
      name: 'cache_valid',
      status: 'pass',
      message: 'valid · matches current git hash',
    }
  } catch {
    return {
      name: 'cache_valid',
      status: 'fail',
      message: 'error reading cache',
      fix: 'agentbrain init --no-cache',
    }
  }
}

async function checkGitHook(repoPath: string): Promise<DoctorCheck> {
  const hookPath = join(repoPath, '.git', 'hooks', 'post-commit')

  if (!existsSync(hookPath)) {
    return {
      name: 'git_hook',
      status: 'fail',
      message: 'post-commit hook missing',
      fix: 'agentbrain setup',
    }
  }

  try {
    const content = await readFile(hookPath, 'utf-8')
    if (!content.includes('AgentBrain')) {
      return {
        name: 'git_hook',
        status: 'warn',
        message: 'hook exists but no AgentBrain section',
        fix: 'agentbrain setup',
      }
    }

    // Check if executable
    try {
      await access(hookPath, constants.X_OK)
      return {
        name: 'git_hook',
        status: 'pass',
        message: 'installed · post-commit',
      }
    } catch {
      return {
        name: 'git_hook',
        status: 'warn',
        message: 'installed but not executable',
        fix: 'chmod +x .git/hooks/post-commit',
      }
    }
  } catch {
    return {
      name: 'git_hook',
      status: 'fail',
      message: 'error reading hook',
      fix: 'agentbrain setup',
    }
  }
}

async function checkHookLog(repoPath: string): Promise<DoctorCheck> {
  const logPath = join(repoPath, '.agentbrain', 'update.log')

  if (!existsSync(logPath)) {
    return {
      name: 'hook_log',
      status: 'warn',
      message: 'no log found — hook may not be running',
    }
  }

  try {
    const content = await readFile(logPath, 'utf-8')
    const lines = content.trim().split('\n')
    const lastLine = lines[lines.length - 1]

    if (lastLine && lastLine.includes('complete')) {
      return {
        name: 'hook_log',
        status: 'pass',
        message: 'recent activity logged',
      }
    }

    return {
      name: 'hook_log',
      status: 'warn',
      message: 'log exists but no successful runs',
    }
  } catch {
    return {
      name: 'hook_log',
      status: 'warn',
      message: 'error reading log',
    }
  }
}

async function checkAgentFiles(repoPath: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = []

  for (const [agent, filePath] of Object.entries(AGENT_FILE_PATHS) as [AgentTarget, string][]) {
    const fullPath = join(repoPath, filePath)

    if (!existsSync(fullPath)) {
      checks.push({
        name: `agent_file_${agent}`,
        status: 'warn',
        message: `${filePath} not found`,
        fix: `agentbrain standards --agents ${agent}`,
      })
      continue
    }

    try {
      const content = await readFile(fullPath, 'utf-8')
      if (!content.includes('agentbrain')) {
        checks.push({
          name: `agent_file_${agent}`,
          status: 'warn',
          message: `${filePath} exists but no injection`,
          fix: 'agentbrain init',
        })
      } else {
        checks.push({
          name: `agent_file_${agent}`,
          status: 'pass',
          message: `${filePath} ✓`,
        })
      }
    } catch {
      checks.push({
        name: `agent_file_${agent}`,
        status: 'warn',
        message: `${filePath} error reading`,
      })
    }
  }

  return checks
}

async function checkContextFreshness(repoPath: string): Promise<DoctorCheck> {
  const contextPath = join(repoPath, 'agentbrain', 'context.md')

  if (!existsSync(contextPath)) {
    return {
      name: 'context_freshness',
      status: 'fail',
      message: 'context.md not found',
      fix: 'agentbrain init',
    }
  }

  try {
    const fs = await import('node:fs/promises')
    const stats = await fs.stat(contextPath)
    const ageMs = Date.now() - stats.mtimeMs
    const ageHours = ageMs / (1000 * 60 * 60)

    if (ageHours < 24) {
      const hours = Math.floor(ageHours)
      return {
        name: 'context_freshness',
        status: 'pass',
        message: `${hours} hours ago (healthy)`,
      }
    }

    if (ageHours < 24 * 7) {
      const days = Math.floor(ageHours / 24)
      return {
        name: 'context_freshness',
        status: 'warn',
        message: `${days} days old`,
        fix: 'agentbrain init --no-cache',
      }
    }

    const days = Math.floor(ageHours / 24)
    return {
      name: 'context_freshness',
      status: 'fail',
      message: `${days} days old (stale)`,
      fix: 'agentbrain init --no-cache',
    }
  } catch {
    return {
      name: 'context_freshness',
      status: 'fail',
      message: 'error reading context file stats',
    }
  }
}

async function checkFileScanSanity(repoPath: string): Promise<DoctorCheck> {
  try {
    const cache = await loadCache(repoPath)
    if (!cache || !cache.fileSummaries) {
      return {
        name: 'file_scan_sanity',
        status: 'warn',
        message: 'no cache to check',
      }
    }

    const fileCount = cache.fileSummaries.length

    if (fileCount < 10) {
      return {
        name: 'file_scan_sanity',
        status: 'warn',
        message: `only ${fileCount} files scanned (may have scanned wrong directory)`,
      }
    }

    if (fileCount > 500) {
      return {
        name: 'file_scan_sanity',
        status: 'warn',
        message: `${fileCount} files scanned (gitignore may not be working)`,
      }
    }

    return {
      name: 'file_scan_sanity',
      status: 'pass',
      message: `${fileCount} files scanned (reasonable)`,
    }
  } catch {
    return {
      name: 'file_scan_sanity',
      status: 'warn',
      message: 'error reading cache',
    }
  }
}
