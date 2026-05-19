import { beforeAll, afterAll } from 'vitest';
import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { Verifier } from '@pact-foundation/pact';
import * as path from 'path';
import * as fs from 'fs';
import { getTestWorker } from '@tests/helpers/worker-helper';

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  let worker: Awaited<ReturnType<typeof getTestWorker>>;
  let providerBaseUrl: string | undefined;

  beforeAll(async () => {
    worker = await getTestWorker();
    const status = worker.getStatus();
    providerBaseUrl = status.url;
  });

  afterAll(async () => {
    if (worker?.stop) await worker.stop();
  });

  it(
    'verifies all Cloudflare Worker consumer pacts against running provider',
    async () => {
    if (!providerBaseUrl) {
      return;
    }

    const pactsDir = path.resolve(process.cwd(), 'tests', 'contracts', 'pacts');
    const providerName = 'Cloudflare Worker';
    const files = fs.readdirSync(pactsDir);
    const pactUrls = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(pactsDir, f))
      .filter((pactPath) => {
        const content = fs.readFileSync(pactPath, 'utf-8');
        const pact = JSON.parse(content) as { provider?: { name?: string } };
        return pact.provider?.name === providerName;
      });
    if (pactUrls.length === 0) {
      throw new Error(
        `No pact files found for provider "${providerName}". Run npm run contracts:generate first. (CreditsDO pacts are verified separately.)`
      );
    }
    const verifier = new Verifier({
      provider: providerName,
      providerBaseUrl,
      pactUrls,
    });
    const output = await verifier.verifyProvider();
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  },
    180000
  );
});
