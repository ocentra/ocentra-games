import type { ProviderId } from '@/types/provider';
import type { AuthType } from './auth-types';
import type { ModelInfo } from '@/types/result';
import { ProviderType } from '@/types/provider';
import { AuthType as AuthTypeConst } from './auth-types';
import { ProviderDefaultModels } from './models';

export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'url' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export type ProviderCategory = 'cloud_api' | 'local_server' | 'in_browser';

export interface ProviderCatalogEntry {
  id: ProviderId;
  name: string;
  description: string;
  website: string;
  authType: AuthType;
  category: ProviderCategory;
  supportsStreaming: boolean;
  supportsModelListing: boolean;
  defaultModels: ModelInfo[];
  configFields: ConfigFieldDefinition[];
  enabled?: boolean;
}

const baseUrlField: ConfigFieldDefinition = {
  key: 'baseUrl',
  label: 'API Base URL',
  type: 'url',
  required: false,
  placeholder: 'https://api.example.com/v1',
};

const localBaseUrlField: ConfigFieldDefinition = {
  key: 'baseUrl',
  label: 'Server URL',
  type: 'url',
  required: true,
  placeholder: 'http://localhost:11434',
};

function catalogEntry(
  id: ProviderId,
  name: string,
  description: string,
  website: string,
  authType: AuthType,
  category: ProviderCategory,
  supportsStreaming: boolean,
  supportsModelListing: boolean,
  configFields: ConfigFieldDefinition[],
  enabled = true
): ProviderCatalogEntry {
  const defaultModels = ProviderDefaultModels[id] ?? [];
  return {
    id,
    name,
    description,
    website,
    authType,
    category,
    supportsStreaming,
    supportsModelListing,
    defaultModels,
    configFields,
    enabled,
  };
}

export const ProviderCatalog: Record<string, ProviderCatalogEntry> = {
  [ProviderType.OpenAI]: catalogEntry(
    ProviderType.OpenAI,
    'OpenAI',
    'GPT-4o, o1, and other models',
    'https://openai.com',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Anthropic]: catalogEntry(
    ProviderType.Anthropic,
    'Anthropic Claude',
    'Claude Sonnet, Haiku, and Opus',
    'https://anthropic.com',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Gemini]: catalogEntry(
    ProviderType.Gemini,
    'Google Gemini',
    'Gemini 2.0 Flash, 1.5 Pro',
    'https://ai.google.dev',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Groq]: catalogEntry(
    ProviderType.Groq,
    'Groq',
    'Fast inference with Llama, Mixtral',
    'https://groq.com',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.DeepSeek]: catalogEntry(
    ProviderType.DeepSeek,
    'DeepSeek',
    'DeepSeek Chat and Coder',
    'https://deepseek.com',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Together]: catalogEntry(
    ProviderType.Together,
    'Together',
    'Open-source models via API',
    'https://together.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Fireworks]: catalogEntry(
    ProviderType.Fireworks,
    'Fireworks',
    'Llama, Mistral, and more',
    'https://fireworks.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Perplexity]: catalogEntry(
    ProviderType.Perplexity,
    'Perplexity',
    'AI search and chat',
    'https://perplexity.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.XAI]: catalogEntry(
    ProviderType.XAI,
    'xAI Grok',
    'Grok 2 and other models',
    'https://x.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Mistral]: catalogEntry(
    ProviderType.Mistral,
    'Mistral AI',
    'Mistral Large and Small',
    'https://mistral.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Cohere]: catalogEntry(
    ProviderType.Cohere,
    'Cohere',
    'Command R and R+',
    'https://cohere.com',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.OpenRouter]: catalogEntry(
    ProviderType.OpenRouter,
    'OpenRouter',
    'Unified access to 200+ models',
    'https://openrouter.ai',
    AuthTypeConst.ApiKey,
    'cloud_api',
    true,
    true,
    [baseUrlField]
  ),
  [ProviderType.Ollama]: catalogEntry(
    ProviderType.Ollama,
    'Ollama',
    'Local LLMs via Ollama',
    'https://ollama.ai',
    AuthTypeConst.None,
    'local_server',
    true,
    true,
    [localBaseUrlField]
  ),
  [ProviderType.LMStudio]: catalogEntry(
    ProviderType.LMStudio,
    'LM Studio',
    'Local models via LM Studio',
    'https://lmstudio.ai',
    AuthTypeConst.None,
    'local_server',
    true,
    false,
    [
      {
        key: 'baseUrl',
        label: 'LM Studio URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:1234/v1',
      },
    ]
  ),
  [ProviderType.VLLM]: catalogEntry(
    ProviderType.VLLM,
    'vLLM',
    'High-throughput local inference',
    'https://vllm.ai',
    AuthTypeConst.None,
    'local_server',
    true,
    false,
    [
      {
        key: 'baseUrl',
        label: 'vLLM Server URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:8000/v1',
      },
    ]
  ),
  [ProviderType.LocalAI]: catalogEntry(
    ProviderType.LocalAI,
    'LocalAI',
    'Local OpenAI-compatible API',
    'https://localai.io',
    AuthTypeConst.None,
    'local_server',
    true,
    false,
    [
      {
        key: 'baseUrl',
        label: 'LocalAI URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:8080/v1',
      },
    ]
  ),
  [ProviderType.KoboldCpp]: catalogEntry(
    ProviderType.KoboldCpp,
    'KoboldCpp',
    'GGML models via KoboldCpp',
    'https://github.com/LostRuins/koboldcpp',
    AuthTypeConst.None,
    'local_server',
    false,
    false,
    [
      {
        key: 'baseUrl',
        label: 'KoboldCpp URL',
        type: 'url',
        required: true,
        placeholder: 'http://localhost:5001',
      },
    ]
  ),
  [ProviderType.LocalTransformers]: catalogEntry(
    ProviderType.LocalTransformers,
    'Local Transformers.js',
    'Models running in the browser',
    'https://huggingface.co/docs/transformers.js',
    AuthTypeConst.None,
    'in_browser',
    true,
    false,
    [
      { key: 'modelId', label: 'Model ID', type: 'text', required: true },
      { key: 'quantPath', label: 'Quant Path', type: 'text', required: false },
    ]
  ),
  [ProviderType.WebLLM]: catalogEntry(
    ProviderType.WebLLM,
    'WebLLM',
    'WebGPU-accelerated local inference (coming soon)',
    'https://webllm.mlc.ai',
    AuthTypeConst.None,
    'in_browser',
    true,
    false,
    [{ key: 'modelId', label: 'Model ID', type: 'text', required: true }],
    false
  ),
  [ProviderType.Native]: catalogEntry(
    ProviderType.Native,
    'Native App',
    'Connect to native desktop app',
    'https://github.com',
    AuthTypeConst.None,
    'local_server',
    true,
    false,
    [
      { key: 'baseUrl', label: 'Native URL', type: 'url', required: false },
      { key: 'connectionType', label: 'Connection', type: 'select', required: true, options: ['http', 'stdin', 'native_messaging', 'webrtc'] },
    ]
  ),
};
