import type {
  GenerationRequest,
  GenerationResult,
  StreamCallback,
  ConnectionTestResult,
  ModelInfo,
} from './result';
import type { ProviderInitConfig } from './config';

export interface ILLMService {
  initialize(config: ProviderInitConfig): Promise<void>;
  generate(request: GenerationRequest): Promise<GenerationResult>;
  generateStream?(
    request: GenerationRequest,
    onToken: StreamCallback
  ): Promise<GenerationResult>;
  isReady(): boolean;
  dispose(): void;
  testConnection(): Promise<ConnectionTestResult>;
  listModels?(): Promise<ModelInfo[]>;
}
