// OpenRouter Provider Implementation

import type { ILLMService } from '../interfaces/ILLMService'
import type { OpenRouterConfig } from './types'
import { ProviderType } from './types'
import { getProviderSecret } from '@/services/providerSecretsService'

const prefix = '[OpenRouterProvider]'
const LOG_GENERAL = false
const LOG_ERROR = true

export class OpenRouterProvider implements ILLMService {
  private config: OpenRouterConfig | null = null
  private apiKey: string | null = null

  async Initialize(modelId?: string, _quantPath?: string): Promise<void> {
    try {
      // Load API key from Firebase secrets
      this.apiKey = await getProviderSecret(ProviderType.OPENROUTER, 'apiKey')
      if (!this.apiKey) {
        throw new Error('OpenRouter API key not configured. Please set it in Settings.')
      }

      this.config = {
        type: ProviderType.OPENROUTER,
        enabled: true,
        name: 'OpenRouter',
        apiKey: this.apiKey,
        baseUrl: (await getProviderSecret(ProviderType.OPENROUTER, 'baseUrl')) || 'https://openrouter.ai/api/v1',
        model: modelId || (await getProviderSecret(ProviderType.OPENROUTER, 'model')) || 'openai/gpt-4o-mini',
        maxTokens: 4096,
        temperature: 0.7,
      }
      void _quantPath

      if (LOG_GENERAL) {
        console.log(prefix, '✅ Initialized OpenRouter provider')
      }
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, '❌ Failed to initialize OpenRouter provider:', error)
      }
      throw error
    }
  }

  async GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string> {
    if (!this.config || !this.apiKey) {
      throw new Error('OpenRouter provider not initialized')
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Claim Game',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      if (LOG_ERROR) {
        console.error(prefix, '❌ Failed to get response from OpenRouter:', error)
      }
      throw error
    }
  }

  IsReady(): boolean {
    return this.config !== null && this.apiKey !== null
  }

  Dispose(): void {
    this.config = null
    this.apiKey = null
  }
}

