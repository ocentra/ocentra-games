import type { ProviderId } from '@/types/provider';
import type { ConnectionTestResult } from '@/types/result';

export interface ProviderSettings {
  providerId: ProviderId;
  enabled: boolean;
  config: Record<string, string>;
  lastTestedAt?: number;
  lastTestResult?: ConnectionTestResult;
}

export interface AISettings {
  defaultProviderId?: ProviderId;
  providers: Record<string, ProviderSettings>;
}
