export const AIErrorCode = {
  ProviderNotFound: 'PROVIDER_NOT_FOUND',
  ProviderNotInitialized: 'PROVIDER_NOT_INITIALIZED',
  AuthenticationFailed: 'AUTHENTICATION_FAILED',
  RateLimited: 'RATE_LIMITED',
  ModelNotFound: 'MODEL_NOT_FOUND',
  InvalidConfig: 'INVALID_CONFIG',
  ConnectionFailed: 'CONNECTION_FAILED',
  GenerationFailed: 'GENERATION_FAILED',
  Timeout: 'TIMEOUT',
  StreamInterrupted: 'STREAM_INTERRUPTED',
  KeyNotConfigured: 'KEY_NOT_CONFIGURED',
} as const;

export type AIErrorCode = (typeof AIErrorCode)[keyof typeof AIErrorCode];

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly providerId?: string
  ) {
    super(message);
    this.name = 'AIError';
  }
}
