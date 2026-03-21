// Coding standards file generator

import { AIClient } from '../ai/client.js'
import type { GenerateStandardsOptions, StandardsOutput, AgentTarget } from '../types.js'

/**
 * Generate CLAUDE.md content
 */
async function generateClaudeStandards(
  client: AIClient,
  stackAnswers: GenerateStandardsOptions['stackAnswers']
): Promise<string> {
  const prompt = `You are creating a CLAUDE.md file for a coding project to guide Claude Code (an AI coding agent).

Stack information:
- Language: ${stackAnswers.language}
- Framework: ${stackAnswers.framework}
- Testing: ${stackAnswers.testingLib}
- Style guide: ${stackAnswers.styleGuide}
- Anti-patterns to avoid: ${stackAnswers.antiPatterns.join(', ')}
- Architecture notes: ${stackAnswers.architectureNotes}

Create a comprehensive CLAUDE.md file that includes:

1. **Project Context**: Brief overview of the project
2. **Tech Stack**: List of technologies and their purposes
3. **Code Standards**:
   - File organization and naming conventions
   - Function/variable naming patterns
   - Import/export conventions
4. **Testing Requirements**: How to write and run tests
5. **Anti-Patterns**: Specific things to avoid in this codebase
6. **Best Practices**: Patterns that work well for this stack

Format as markdown. Be specific and actionable. This will be read at the start of every Claude Code session.`

  const response = await client.generate(
    [{ role: 'user', content: prompt }],
    'mid',
    { maxTokens: 3000, temperature: 0.5 }
  )

  return response.content
}

/**
 * Generate .cursor/rules content
 */
async function generateCursorStandards(
  client: AIClient,
  stackAnswers: GenerateStandardsOptions['stackAnswers']
): Promise<string> {
  const prompt = `You are creating a .cursor/rules file for a coding project to guide Cursor AI.

Stack information:
- Language: ${stackAnswers.language}
- Framework: ${stackAnswers.framework}
- Testing: ${stackAnswers.testingLib}
- Style guide: ${stackAnswers.styleGuide}
- Anti-patterns to avoid: ${stackAnswers.antiPatterns.join(', ')}
- Architecture notes: ${stackAnswers.architectureNotes}

Create a .cursor/rules file with clear, concise coding standards. Format as plain text with sections:

PROJECT_CONTEXT:
[Brief project description]

TECH_STACK:
[List technologies]

CODING_STANDARDS:
[File naming, code style, conventions]

TESTING:
[Testing approach and requirements]

PATTERNS_TO_FOLLOW:
[Recommended patterns]

PATTERNS_TO_AVOID:
[Anti-patterns specific to this project]

Keep it concise but comprehensive. This guides Cursor's code generation.`

  const response = await client.generate(
    [{ role: 'user', content: prompt }],
    'mid',
    { maxTokens: 2500, temperature: 0.5 }
  )

  return response.content
}

/**
 * Generate .windsurfrules content
 */
async function generateWindsurfStandards(
  client: AIClient,
  stackAnswers: GenerateStandardsOptions['stackAnswers']
): Promise<string> {
  const prompt = `You are creating a .windsurfrules file for a coding project to guide Windsurf AI.

Stack information:
- Language: ${stackAnswers.language}
- Framework: ${stackAnswers.framework}
- Testing: ${stackAnswers.testingLib}
- Style guide: ${stackAnswers.styleGuide}
- Anti-patterns to avoid: ${stackAnswers.antiPatterns.join(', ')}
- Architecture notes: ${stackAnswers.architectureNotes}

Create a .windsurfrules file optimized for Windsurf. Use their preferred format:

# Project Overview
[Brief description]

# Tech Stack
[Technologies used]

# Code Conventions
[Naming, formatting, structure standards]

# Testing Strategy
[How to test]

# Recommended Patterns
[What works well]

# Anti-Patterns
[What to avoid]

Be clear and specific. Windsurf uses this to maintain consistency.`

  const response = await client.generate(
    [{ role: 'user', content: prompt }],
    'mid',
    { maxTokens: 2500, temperature: 0.5 }
  )

  return response.content
}

/**
 * Generate coding standards for specified agents
 */
export async function generateStandards(
  options: GenerateStandardsOptions
): Promise<StandardsOutput> {
  const { aiConfig, stackAnswers, agents } = options
  const client = new AIClient(aiConfig)
  const output: StandardsOutput = {}

  for (const agent of agents) {
    switch (agent) {
      case 'claude-code':
        output['claude-code'] = await generateClaudeStandards(client, stackAnswers)
        break
      case 'cursor':
        output.cursor = await generateCursorStandards(client, stackAnswers)
        break
      case 'windsurf':
        output.windsurf = await generateWindsurfStandards(client, stackAnswers)
        break
    }
  }

  return output
}
