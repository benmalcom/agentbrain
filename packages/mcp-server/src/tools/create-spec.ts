// create-spec.ts - MCP tool to save spec content (no AI generation)

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

/**
 * Expand path: handles ~, relative paths, etc.
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir())
  }
  return resolve(path)
}

/**
 * Convert task to slug format
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface CreateSpecInput {
  repoPath: string
  task: string
  content: string
}

export interface CreateSpecOutput {
  specPath: string
  slug: string
}

export async function createSpecTool(input: CreateSpecInput): Promise<CreateSpecOutput> {
  const { repoPath, task, content } = input

  const expandedPath = expandPath(repoPath)
  const slug = slugify(task)

  // Ensure specs directory exists
  const specsDir = join(expandedPath, '.agentbrain', 'specs')
  if (!existsSync(specsDir)) {
    await mkdir(specsDir, { recursive: true })
  }

  // Write spec file
  const specPath = join(specsDir, `${slug}.md`)
  await writeFile(specPath, content, 'utf-8')

  return {
    specPath: `.agentbrain/specs/${slug}.md`,
    slug,
  }
}

export const createSpecSchema = {
  name: 'create_spec',
  description:
    'Save a task specification to disk. The agent provides the spec content (already written), and this tool saves it to .agentbrain/specs/<slug>.md. No AI calls - pure file write.',
  inputSchema: {
    type: 'object',
    properties: {
      repoPath: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      task: {
        type: 'string',
        description: 'Task name (will be slugified for filename)',
      },
      content: {
        type: 'string',
        description: 'Full spec content in markdown format (written by agent)',
      },
    },
    required: ['repoPath', 'task', 'content'],
  },
}
