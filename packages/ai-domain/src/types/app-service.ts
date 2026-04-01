export const ILLMProvider = {
  LocalLLM: 'LocalLLM',
  OpenAI: 'OpenAI',
  OpenRouter: 'OpenRouter',
  LMStudio: 'LMStudio',
  Native: 'Native',
  TabAgentServer: 'TabAgentServer',
} as const;

export type ILLMProvider = (typeof ILLMProvider)[keyof typeof ILLMProvider];

export interface ILLMConfig {
  provider: ILLMProvider;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export type ILLMService = {
  GetResponseAsync(systemMessage: string, userPrompt: string): Promise<string>;
  IsReady(): boolean;
  Initialize(modelId?: string, quantPath?: string): Promise<void>;
  Dispose(): void;
};
