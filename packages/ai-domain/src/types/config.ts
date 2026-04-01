import type { ProviderId } from './provider';

export interface BaseProviderConfig {
  providerId: ProviderId;
  enabled: boolean;
  name: string;
  description?: string;
}

export interface ApiKeyProviderConfig extends BaseProviderConfig {
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LocalServerConfig extends BaseProviderConfig {
  baseUrl: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LocalInferenceConfig extends BaseProviderConfig {
  modelId: string;
  quantPath?: string;
  dtype?: string;
}

export interface NativeConfig extends BaseProviderConfig {
  connectionType: 'http' | 'stdin' | 'native_messaging' | 'webrtc';
  baseUrl?: string;
  webrtcSignalingUrl?: string;
  nativeHostId?: string;
}

export type ProviderConfigUnion =
  | ApiKeyProviderConfig
  | LocalServerConfig
  | LocalInferenceConfig
  | NativeConfig;

export interface ProviderInitConfig {
  providerId: ProviderId;
  model?: string;
  baseUrl?: string;
  connectionType?: 'http' | 'stdin' | 'native_messaging' | 'webrtc';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  quantPath?: string;
  dtype?: string;
}
