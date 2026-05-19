import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { InventoryDOSegment, ProfileDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { BadgeId } from '@ocentra/endpoint-domain/constants/badges';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Profile GET: returns 200 with displayName and avatarUrl when authenticated'), async () => {
    const url = buildApiUrl(ApiEndpoint.Profile.ById(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { displayName?: string; avatarUrl?: string };
    expect(typeof data.displayName).toBe('string');
    expect(typeof data.avatarUrl).toBe('string');
  });

  it(testName('Profile GET: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(ApiEndpoint.Profile.ById(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Profile POST update: returns 200 and persists displayName'), async () => {
    const updateUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Profile.ById(TestConfig.TestUserId)}/update`;
    const payload = { displayName: 'TestDisplay' };
    const updateRes = await worker.fetch(updateUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify(payload),
    });
    expect(updateRes.status).toBe(HttpStatus.Ok);
    const getUrl = buildApiUrl(ApiEndpoint.Profile.ById(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const getRes = await worker.fetch(getUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(getRes.status).toBe(HttpStatus.Ok);
    const data = (await getRes.json()) as { displayName?: string };
    expect(data.displayName).toBe('TestDisplay');
  });

  it(testName('Profile POST add-badge: rejects client-authoritative profile badge mutation'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Profile.ById(TestConfig.TestUserId)}/${ProfileDOSegment.AddBadge}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        badgeId: BadgeId.ProGold,
        name: 'Pro Gold',
        source: 'client',
      }),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBe('Profile badges must be issued by trusted server workflows');
  });

  it(testName('Profile POST update-stats: rejects client-authoritative public stats mutation'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Profile.ById(TestConfig.TestUserId)}/${ProfileDOSegment.UpdateStats}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        level: 99,
        gamesPlayed: 1,
        wins: 1,
      }),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBe('Profile stats must be issued by trusted server workflows');
  });

  it(testName('Settings GET: returns 200 with settings object when authenticated'), async () => {
    const url = buildApiUrl(ApiEndpoint.Settings.ByUser(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { settings?: Record<string, unknown> };
    expect(data.settings !== undefined).toBe(true);
    expect(typeof data.settings).toBe('object');
  });

  it(testName('Settings GET: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(ApiEndpoint.Settings.ByUser(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Settings POST update: returns 200 and persists theme'), async () => {
    const updateUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Settings.ByUser(TestConfig.TestUserId)}/update`;
    const payload = { theme: 'dark' };
    const updateRes = await worker.fetch(updateUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify(payload),
    });
    expect(updateRes.status).toBe(HttpStatus.Ok);
    const getUrl = buildApiUrl(ApiEndpoint.Settings.ByUser(TestConfig.TestUserId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const getRes = await worker.fetch(getUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(getRes.status).toBe(HttpStatus.Ok);
    const data = (await getRes.json()) as { settings?: { theme?: string } };
    expect(data.settings?.theme).toBe('dark');
  });

  it(testName('Inventory GET list: returns 200 with items and equipped when authenticated'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/list`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { items?: unknown[]; equipped?: Record<string, string> };
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.equipped).toBe('object');
  });

  it(testName('Inventory GET list: returns 401 when auth missing'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/list`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Inventory POST add-item: rejects client-authoritative inventory mint'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/${InventoryDOSegment.AddItem}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        itemId: 'premium-card-back',
        type: 'cosmetic',
        count: 10,
      }),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBe('Inventory items must be issued by trusted server workflows');
  });

  it(testName('Inventory POST remove-item: rejects client-authoritative inventory removal'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/${InventoryDOSegment.RemoveItem}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        itemId: 'premium-card-back',
      }),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toBe('Inventory item removal must be issued by trusted server workflows');
  });
});
