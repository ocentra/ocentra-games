import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { requireAuth } from '@/utils/auth-middleware';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import type { Env } from '@/constants/env';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('auth middleware: bypasses auth in development when DISABLE_AUTH is enabled'), async () => {
    const request = new Request('http://127.0.0.1:8787/api/v1/admin/dashboard-data');

    const result = await requireAuth(request, {
      ENVIRONMENT: Environment.Development,
      DISABLE_AUTH: QueryValue.True,
      MATCHES_BUCKET: {} as Env['MATCHES_BUCKET'],
      MATCH_COORDINATOR: {} as Env['MATCH_COORDINATOR'],
    } as Env);

    expect(result).toEqual({ userId: 'dev-admin' });
  });
});
