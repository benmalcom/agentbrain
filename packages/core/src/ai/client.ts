// Provider-agnostic AI wrapper

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AIConfig, ModelTier } from '../types.js'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  content: string
  tokenCount: number
}

/**
 * Universal AI client that works with both Anthropic and OpenAI
 */
export class AIClient {
  private anthropic?: Anthropic
  private openai?: OpenAI
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = config

    if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({ apiKey: config.apiKey })
    } else {
      this.openai = new OpenAI({ apiKey: config.apiKey })
    }
  }

  /**
   * Generate a completion using the specified model tier
   */
  async generate(
    messages: AIMessage[],
    tier: ModelTier = 'mid',
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    const model = this.config.models[tier]

    if (this.config.provider === 'anthropic') {
      return this.generateAnthropic(messages, model, options)
    } else {
      return this.generateOpenAI(messages, model, options)
    }
  }

  private async generateAnthropic(
    messages: AIMessage[],
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized')
    }

    // Separate system messages from conversation
    const systemMessages = messages.filter((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 1.0,
      system: systemMessages.map((m) => m.content).join('\n\n'),
      messages: conversationMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    return {
      content: content.text,
      tokenCount: response.usage.input_tokens + response.usage.output_tokens,
    }
  }

  private async generateOpenAI(
    messages: AIMessage[],
    model: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    const response = await this.openai.chat.completions.create({
      model,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 1.0,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    return {
      content,
      tokenCount: response.usage?.total_tokens ?? 0,
    }
  }

  /**
   * Estimate token count for a string (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate cost estimate in USD based on tokens and provider
   */
  calculateCost(tokens: number, tier: ModelTier): number {
    // Pricing per 1M tokens (approximate as of Jan 2025)
    const pricing = {
      anthropic: {
        fast: 0.25, // Haiku
        mid: 3.0, // Sonnet
        smart: 15.0, // Opus
      },
      openai: {
        fast: 0.15, // GPT-4o-mini
        mid: 2.5, // GPT-4o
        smart: 10.0, // GPT-4.1
      },
    }

    const pricePerMillion = pricing[this.config.provider][tier]
    return (tokens / 1_000_000) * pricePerMillion
  }
}
