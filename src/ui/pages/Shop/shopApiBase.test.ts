import { describe, expect, it } from 'vitest';
import { resolveShopApiBaseUrl } from '@/ui/pages/Shop/shopApiBase';

describe('resolveShopApiBaseUrl', () => {
  it('uses the configured worker URL for deployed Pages builds', () => {
    expect(resolveShopApiBaseUrl({
      appOrigin: 'https://main.ocentra-games.pages.dev',
      workerUrl: 'https://claim-storage-dev.ocentraai.workers.dev',
    })).toBe('https://claim-storage-dev.ocentraai.workers.dev');
  });

  it('falls back to app origin when no worker URL is configured', () => {
    expect(resolveShopApiBaseUrl({
      appOrigin: 'http://localhost:3000',
      workerUrl: '',
    })).toBe('http://localhost:3000');
  });

  it('normalizes trailing slashes', () => {
    expect(resolveShopApiBaseUrl({
      appOrigin: 'http://localhost:3000/',
      workerUrl: 'http://127.0.0.1:8787/',
    })).toBe('http://127.0.0.1:8787');
  });
});
