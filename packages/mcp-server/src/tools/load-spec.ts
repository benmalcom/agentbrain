// MCP tool: load_spec - Load specification files

import { listSpecs, loadSpec } from '@agentbrain/core'

export interface LoadSpecInput {
  repoPath: string
  task?: string
}

export const loadSpecSchema = {
  name: 'load_spec',
  description:
    'Load a specification file by task name, or list all available specs if no task provided',
  inputSchema: {
    type: 'object',
    properties: {
      repoPath: {
        type: 'string',
        description: 'Absolute path to the repository',
      },
      task: {
        type: 'string',
        description:
          'Optional: Task description or slug to load specific spec (e.g., "add-stripe-webhook-handler")',
      },
    },
    required: ['repoPath'],
  },
}

export async function loadSpecTool(
  input: LoadSpecInput
): Promise<{ content: string; slug?: string }> {
  const { repoPath, task } = input

  // If no task provided, list all available specs
  if (!task) {
    const specs = await listSpecs(repoPath)

    if (specs.length === 0) {
      return {
        content:
          'No specs found. Run `agentbrain spec "<task>"` to create your first specification.',
      }
    }

    return {
      content: `Available specs:\n\n${specs.map((s) => `- ${s}`).join('\n')}\n\nTo load a spec, provide the task slug as the "task" parameter.`,
    }
  }

  // Convert task to slug format (kebab-case)
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const content = await loadSpec(repoPath, slug)

  if (!content) {
    return {
      content: `Spec not found: ${slug}\n\nRun \`agentbrain spec "${task}"\` to create it.`,
    }
  }

  return {
    content,
    slug,
  }
}
