#!/usr/bin/env node

// AgentBrain MCP Server

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { scanRepo, scanRepoSchema } from './tools/scan-repo.js'
import type { ScanRepoInput } from './tools/scan-repo.js'
import { loadStandards, loadStandardsSchema } from './tools/load-standards.js'
import type { LoadStandardsInput } from './tools/load-standards.js'
import { loadContext, loadContextSchema } from './tools/load-context.js'
import type { LoadContextInput } from './tools/load-context.js'
import { saveHandoff, saveHandoffSchema } from './tools/save-handoff.js'
import type { SaveHandoffInput } from './tools/save-handoff.js'

// Create MCP server
const server = new Server(
  {
    name: 'agentbrain',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      scanRepoSchema,
      loadStandardsSchema,
      loadContextSchema,
      saveHandoffSchema,
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'scan_repo': {
        const result = await scanRepo(args as unknown as ScanRepoInput)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'load_standards': {
        const result = await loadStandards(args as unknown as LoadStandardsInput)
        return {
          content: [{ type: 'text', text: result.content }],
        }
      }

      case 'load_context': {
        const result = await loadContext(args as unknown as LoadContextInput)
        return {
          content: [
            {
              type: 'text',
              text: `${result.content}\n\n---\n\n[Loaded from ${result.fromCache ? 'cache' : 'fresh generation'}, tokens used: ${result.tokensUsed}]`,
            },
          ],
        }
      }

      case 'save_handoff': {
        const result = await saveHandoff(args as unknown as SaveHandoffInput)
        return {
          content: [
            {
              type: 'text',
              text: `Handoff saved to ${result.filePath}\n\nTokens used: ${result.tokensUsed}\n\n---\n\n${result.content}`,
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error('AgentBrain MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
