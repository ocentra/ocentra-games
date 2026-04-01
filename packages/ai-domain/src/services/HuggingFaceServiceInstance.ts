import { HuggingFaceService } from '@/services/HuggingFaceService';
import { getAuthenticatedHeaders } from '@/api/ui-settings';

const fetchAdapter = { fetch: (url: string, init?: RequestInit) => fetch(url, init) };

let instance: HuggingFaceService | null = null;

export function getHuggingFaceServiceInstance(): HuggingFaceService {
  if (!instance) {
    instance = new HuggingFaceService({
      fetch: fetchAdapter,
      getHeaders: getAuthenticatedHeaders,
    });
  }
  return instance;
}
