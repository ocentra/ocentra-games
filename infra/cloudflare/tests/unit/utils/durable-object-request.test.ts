import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import { createDORequest, fetchFromDO, fetchFromCreditsDO } from '@/utils/durable-object-request';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('createDORequest: sets default JSON content-type for body and propagates correlation header'), () => {
    const request = createDORequest('/test/path?kind=alpha', {
      method: HttpMethod.Post,
      body: '{"ok":true}',
      correlationId: 'corr-123',
    });

    expect(request.method).toBe(HttpMethod.Post);
    expect(request.url).toContain('/test/path?kind=alpha');
    expect(request.headers.get(HttpHeader.ContentType)).toBe(HttpContentType.ApplicationJson);
    expect(request.headers.get(HttpHeader.XCorrelationId)).toBe('corr-123');
  });

  it(testName('createDORequest: preserves explicit content-type header when provided'), () => {
    const request = createDORequest('/test/path', {
      method: HttpMethod.Post,
      body: '<xml />',
      headers: { [HttpHeader.ContentType]: 'application/xml' },
    });

    expect(request.headers.get(HttpHeader.ContentType)).toBe('application/xml');
  });

  it(testName('fetchFromDO: forwards request to DO stub including correlation ID'), async () => {
    let capturedCorrelationHeader: string | null = null;
    const stub = {
      fetch: vi.fn(async (request: Request) => {
        capturedCorrelationHeader = request.headers.get(HttpHeader.XCorrelationId);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    } as unknown as DurableObjectStub;

    const response = await fetchFromDO(stub, '/credits/do', {
      method: HttpMethod.Get,
      correlationId: 'trace-abc',
    });

    expect(response.status).toBe(200);
    expect(stub.fetch).toHaveBeenCalledTimes(1);
    expect(capturedCorrelationHeader).toBe('trace-abc');
  });

  it(testName('fetchFromDO: throws descriptive error when stub is missing'), async () => {
    await expect(fetchFromDO(null as unknown as DurableObjectStub, '/x', { method: HttpMethod.Get }))
      .rejects
      .toThrow('Durable Object stub is null or undefined');
  });

  it(testName('fetchFromDO: wraps fetch connectivity errors with path context'), async () => {
    const stub = {
      fetch: vi.fn(async () => {
        throw new Error('Failed to fetch');
      }),
    } as unknown as DurableObjectStub;

    await expect(fetchFromDO(stub, '/bad/path', { method: HttpMethod.Get }))
      .rejects
      .toThrow('DO fetch failed for path "/bad/path"');
  });

  it(testName('fetchFromCreditsDO: delegates to fetchFromDO'), async () => {
    const stub = {
      fetch: vi.fn(async () => new Response('ok', { status: 201 })),
    } as unknown as DurableObjectStub;

    const response = await fetchFromCreditsDO(stub, '/credits', { method: HttpMethod.Post, body: '{}' });

    expect(response.status).toBe(201);
    expect(stub.fetch).toHaveBeenCalledTimes(1);
  });
});
