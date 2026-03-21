// MCP tool: scan_repo - inspect repo structure (no API key needed)

import { scanRepository } from '@agentbrain/core'

export interface ScanRepoInput {
  repo_path: string
  max_files?: number
}

export interface ScanRepoOutput {
  totalFiles: number
  relevantFiles: Array<{
    path: string
    language: string
    size: number
  }>
  scannedAt: string
}

export async function scanRepo(input: ScanRepoInput): Promise<ScanRepoOutput> {
  const { repo_path, max_files = 100 } = input

  const result = await scanRepository(repo_path, { maxFiles: max_files })

  return {
    totalFiles: result.totalFiles,
    relevantFiles: result.relevantFiles.map((f) => ({
      path: f.path,
      language: f.language,
      size: f.size,
    })),
    scannedAt: result.scannedAt,
  }
}

export const scanRepoSchema = {
  name: 'scan_repo',
  description:
    'Inspect repository structure and get list of relevant files. No API key required - pure file analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      repo_path: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      max_files: {
        type: 'number',
        description: 'Maximum number of files to analyze (default: 100)',
      },
    },
    required: ['repo_path'],
  },
}
