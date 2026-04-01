import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildCreditsApiUrl } from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Rule 12.3: protected endpoint with spoofed CF-Connecting-IP and no auth returns 401'), async () => {
    const userId = `${TestConfig.TestUserId}-cross-layer`;
    const url = buildCreditsApiUrl(userId, CreditAction.Balance);
    const res = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.CFConnectingIP]: '1.2.3.4',
      },
    });
    expect(res.status).toBe(HttpStatus.Unauthorized);
    await res.text();
  });

  it(testName('Rule 12.3: protected endpoint with spoofed X-Forwarded-For and no auth returns 401'), async () => {
    const userId = `${TestConfig.TestUserId}-cross-layer-xff`;
    const url = buildCreditsApiUrl(userId, CreditAction.Balance);
    const res = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        'X-Forwarded-For': '10.0.0.1, 192.168.1.1',
      },
    });
    expect(res.status).toBe(HttpStatus.Unauthorized);
    await res.text();
  });
});
