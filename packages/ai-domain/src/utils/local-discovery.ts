import type { FetchAdapter } from '@/types/adapters';
import type { ProviderId } from '@/types/provider';
import { ProviderType } from '@/types/provider';

export interface DiscoveryTarget {
  port: number;
  path: string;
  providerId: ProviderId;
  name: string;
}

export interface DiscoveredProvider {
  providerId: ProviderId;
  name: string;
  baseUrl: string;
  models?: string[];
}

const DISCOVERY_TARGETS: DiscoveryTarget[] = [
  { port: 11434, path: '/api/tags', providerId: ProviderType.Ollama, name: 'Ollama' },
  { port: 1234, path: '/v1/models', providerId: ProviderType.LMStudio, name: 'LM Studio' },
  { port: 8000, path: '/v1/models', providerId: ProviderType.VLLM, name: 'vLLM' },
  { port: 8080, path: '/v1/models', providerId: ProviderType.LocalAI, name: 'LocalAI' },
  { port: 5001, path: '/api/v1/model', providerId: ProviderType.KoboldCpp, name: 'KoboldCpp' },
];

export async function discoverLocalProviders(
  fetchAdapter: FetchAdapter,
  timeoutMs = 2000
): Promise<DiscoveredProvider[]> {
  const results = await Promise.all(
    DISCOVERY_TARGETS.map(async (target) => {
      const baseUrl = `http://localhost:${target.port}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchAdapter.fetch(`${baseUrl}${target.path}`, {
          signal: controller.signal,
          method: 'GET',
        });
        clearTimeout(timeout);
        if (response.ok) {
          const discovered: DiscoveredProvider = {
            providerId: target.providerId,
            name: target.name,
            baseUrl,
          };
          return discovered;
        }
      } catch {
        clearTimeout(timeout);
      }
      return null;
    })
  );
  return results.filter((r): r is DiscoveredProvider => r !== null);
}
