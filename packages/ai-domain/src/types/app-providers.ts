import { ProviderType } from '@ocentra/boundary-domain/types/provider-type';
export { ProviderType } from '@ocentra/boundary-domain/types/provider-type';

export interface ProviderConfig {
  type: ProviderType;
  enabled: boolean;
  name: string;
  description?: string;
}

export interface OpenAIConfig extends ProviderConfig {
  type: (typeof ProviderType)['OPENAI'];
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenRouterConfig extends ProviderConfig {
  type: (typeof ProviderType)['OPENROUTER'];
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LMStudioConfig extends ProviderConfig {
  type: (typeof ProviderType)['LMSTUDIO'];
  baseUrl: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface NativeConfig extends ProviderConfig {
  type: (typeof ProviderType)['NATIVE'];
  connectionType: 'http' | 'stdin' | 'native_messaging' | 'webrtc';
  baseUrl?: string;
  apiKey?: string;
  webrtcSignalingUrl?: string;
  nativeHostId?: string;
}

export interface TabAgentServerConfig extends ProviderConfig {
  type: (typeof ProviderType)['TABAGENT_SERVER'];
  serverUrl: string;
  apiKey?: string;
}

export type ProviderConfigUnion =
  | OpenAIConfig
  | OpenRouterConfig
  | LMStudioConfig
  | NativeConfig
  | TabAgentServerConfig;

export interface ProviderSecrets {
  userId: string;
  providers: {
    [key in ProviderType]?: {
      apiKey?: string;
      baseUrl?: string;
      serverUrl?: string;
      webrtcSignalingUrl?: string;
      nativeHostId?: string;
      [key: string]: string | undefined;
    };
  };
  updatedAt: number;
}
