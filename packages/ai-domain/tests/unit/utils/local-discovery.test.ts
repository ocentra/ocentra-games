import { describe, it, expect } from 'vitest';
import { discoverLocalProviders } from '@/utils/local-discovery';
import { SubstitutableFetchAdapter } from '../../helpers/substitute-adapters';

describe('local-discovery', () => {
  it('discoverLocalProviders: returns empty when all targets fail', async () => {
    const fetchSub = new SubstitutableFetchAdapter();
    for (let i = 0; i < 5; i++) {
      fetchSub.primeReject(new Error('network'));
    }
    const results = await discoverLocalProviders(
      { fetch: fetchSub.fetch.bind(fetchSub) },
      100
    );
    expect(results).toHaveLength(0);
  });

  it('discoverLocalProviders: returns discovered providers when fetch succeeds', async () => {
    const fetchSub = new SubstitutableFetchAdapter();
    for (let i = 0; i < 20; i++) {
      fetchSub.prime(new Response('{}', { status: 200 }));
    }
    const results = await discoverLocalProviders(
      { fetch: fetchSub.fetch.bind(fetchSub) },
      5000
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('providerId');
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('baseUrl');
    expect(results[0].baseUrl).toMatch(/^http:\/\/localhost:\d+$/);
  });

  it('discoverLocalProviders: excludes targets that return non-200', async () => {
    const fetchSub = new SubstitutableFetchAdapter();
    fetchSub.prime(new Response('', { status: 200 }));
    for (let i = 0; i < 4; i++) {
      fetchSub.prime(new Response('', { status: 404 }));
    }
    const results = await discoverLocalProviders(
      { fetch: fetchSub.fetch.bind(fetchSub) },
      5000
    );
    expect(results.length).toBe(1);
  });
});
