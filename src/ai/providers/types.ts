// Provider types and interfaces for external LLM providers

// Per erasableSyntaxOnly: Use const object instead of enum
export const ProviderType = {
  LOCAL: 'local',
  OPENAI: 'openai',
  OPENROUTER: 'openrouter',
  LMSTUDIO: 'lmstudio',
  NATIVE: 'native',
  TABAGENT_SERVER: 'tabagent_server',
} as const;

export type ProviderType = typeof ProviderType[keyof typeof ProviderType];

export interface ProviderConfig {
  type: ProviderType
  enabled: boolean
  name: string
  description?: string
}

export interface OpenAIConfig extends ProviderConfig {
  type: 'openai'  // Use string literal type instead of enum reference
  apiKey: string
  baseUrl?: string // Default: https://api.openai.com/v1
  model?: string // Default: gpt-4o-mini
  maxTokens?: number
  temperature?: number
}

export interface OpenRouterConfig extends ProviderConfig {
  type: 'openrouter'  // Use string literal type instead of enum reference
  apiKey: string
  baseUrl?: string // Default: https://openrouter.ai/api/v1
  model?: string // Default: openai/gpt-4o-mini
  maxTokens?: number
  temperature?: number
}

export interface LMStudioConfig extends ProviderConfig {
  type: 'lmstudio'  // Use string literal type instead of enum reference
  baseUrl: string // Default: http://localhost:1234/v1
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface NativeConfig extends ProviderConfig {
  type: 'native'  // Use string literal type instead of enum reference
  connectionType: 'http' | 'stdin' | 'native_messaging' | 'webrtc'
  baseUrl?: string
  apiKey?: string
  webrtcSignalingUrl?: string
  nativeHostId?: string
}

export interface TabAgentServerConfig extends ProviderConfig {
  type: 'tabagent_server'  // Use string literal type instead of enum reference
  serverUrl: string
  apiKey?: string
}

export type ProviderConfigUnion =
  | OpenAIConfig
  | OpenRouterConfig
  | LMStudioConfig
  | NativeConfig
  | TabAgentServerConfig

export interface ProviderSecrets {
  userId: string
  providers: {
    [key in ProviderType]?: {
      apiKey?: string
      baseUrl?: string
      serverUrl?: string
      webrtcSignalingUrl?: string
      nativeHostId?: string
      // Other provider-specific secrets
      [key: string]: string | undefined
    }
  }
  updatedAt: number
}

