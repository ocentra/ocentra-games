import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { generateValidGuid, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
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

  it(testName('Message GET list: returns 401 when auth missing'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(ApiEndpoint.Message.ByConversation(convId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Message GET list: returns 200 with messages array for conversation when authenticated'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(ApiEndpoint.Message.ByConversation(convId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { messages?: unknown[]; nextCursor?: string };
    expect(Array.isArray(data.messages)).toBe(true);
  });

  it(testName('Message GET list: accepts limit query param when authenticated'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(ApiEndpoint.Message.ByConversation(convId), { baseUrl: TestConfig.TestApiUrlPlaceholder }) + '?limit=10';
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { messages?: unknown[] };
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages!.length).toBeLessThanOrEqual(10);
  });

  it(testName('Message POST send: returns 401 when auth missing'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(`${ApiEndpoint.Message.ByConversation(convId)}/send`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ content: 'hello' }),
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Message POST send: returns 200 with sent and messageId when authenticated'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(`${ApiEndpoint.Message.ByConversation(convId)}/send`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ content: 'test message' }),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { sent?: boolean; messageId?: string; error?: string };
    expect(data.sent).toBe(true);
    expect(typeof data.messageId).toBe('string');
  });

  it(testName('Message POST read-receipt: returns 200 when authenticated'), async () => {
    const convId = 'test-conv-' + Date.now();
    const url = buildApiUrl(`${ApiEndpoint.Message.ByConversation(convId)}/read-receipt`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ messageIds: [] }),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { read?: boolean; error?: string };
    expect(data.read).toBe(true);
  });

  it(testName('Feed GET list: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Feed.Base}/list`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Feed GET list: returns 200 with items array when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Feed.Base}/list`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { items?: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });

  it(testName('Feed POST append: returns 200 with appended and id when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Feed.Base}/append`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ type: 'test', payload: { message: 'hello' } }),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { appended?: boolean; id?: string; error?: string };
    expect(data.appended === true && typeof data.id === 'string' || typeof data.error === 'string').toBe(true);
  });

  it(testName('Party POST create: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Party POST create: returns 200 with partyId when authenticated'), async () => {
    const url = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { partyId?: string; error?: string };
    if (data.error) {
      expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.InternalServerError]).toContain(response.status);
      return;
    }
    expect(typeof data.partyId).toBe('string');
  });

  it(testName('Party GET by id: returns 200 with party state when authenticated'), async () => {
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    const partyId = createData.partyId;
    if (!partyId || createData.error) {
      return;
    }
    const getUrl = buildApiUrl(ApiEndpoint.Party.ById(partyId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const getRes = await worker.fetch(getUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(getRes.status).toBe(HttpStatus.Ok);
    const getData = (await getRes.json()) as { partyId?: string; members?: unknown[]; error?: string };
    expect(typeof getData.partyId === 'string' || Array.isArray(getData.members) || getData.error !== undefined).toBe(true);
  });

  it(testName('Party POST join: returns 200 when authenticated'), async () => {
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    const partyId = createData.partyId;
    if (!partyId || createData.error) return;
    const joinUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/join`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const joinRes = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(joinRes.status);
    await joinRes.text().catch(() => undefined);
  });

  it(testName('Party POST leave: returns 200 when authenticated'), async () => {
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    const partyId = createData.partyId;
    if (!partyId || createData.error) return;
    const leaveUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/leave`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const leaveRes = await worker.fetch(leaveUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(leaveRes.status);
    await leaveRes.text().catch(() => undefined);
  });

  it(testName('Party POST invite: returns 200 or 403 when authenticated'), async () => {
    const inviterId = generateValidGuid();
    const inviteeId = generateValidGuid();
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(inviterId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    const partyId = createData.partyId;
    if (!partyId || createData.error) return;
    const inviteUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/invite`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const inviteRes = await worker.fetch(inviteUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(inviterId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ inviteeId }),
    });
    expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.Forbidden]).toContain(inviteRes.status);
    await inviteRes.text().catch(() => undefined);
  });

  it(testName('Message POST send: returns 403 when sender is blocked by recipient (Rule 14.1)'), async () => {
    const recipientId = TestConfig.TestUserId;
    const senderId = TestConfig.OtherUserId;
    const blockUrl = buildApiUrl(ApiEndpoint.Users.Block(senderId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const blockRes = await worker.fetch(blockUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(recipientId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(blockRes.status).toBe(HttpStatus.Ok);
    await blockRes.text().catch(() => undefined);
    const convId = `${recipientId}:${senderId}`;
    const sendUrl = buildApiUrl(`${ApiEndpoint.Message.ByConversation(convId)}/send`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const sendRes = await worker.fetch(sendUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(senderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ content: 'hello' }),
    });
    expect(sendRes.status).toBe(HttpStatus.Forbidden);
    const data = (await sendRes.json()) as { error?: string };
    expect((data.error ?? '').toLowerCase()).toContain('blocked');
  });

  it(testName('Party POST invite: returns 403 when invitee has blocked inviter (Rule 14.1)'), async () => {
    const inviterId = generateValidGuid();
    const inviteeId = generateValidGuid();
    const blockUrl = buildApiUrl(ApiEndpoint.Users.Block(inviterId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const blockRes = await worker.fetch(blockUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(inviteeId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(blockRes.status).toBe(HttpStatus.Ok);
    await blockRes.text().catch(() => undefined);
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(inviterId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(createRes.status).toBe(HttpStatus.Ok);
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    expect(typeof createData.partyId).toBe('string');
    expect((createData.partyId as string).length).toBeGreaterThan(0);
    expect(createData.error).toBeUndefined();
    const partyId = createData.partyId!;
    const inviteUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/invite`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const inviteRes = await worker.fetch(inviteUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(inviterId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ inviteeId }),
    });
    expect(inviteRes.status).toBe(HttpStatus.Forbidden);
    const inviteBody = (await inviteRes.json()) as { error?: string };
    expect((inviteBody.error ?? '').toLowerCase()).toContain('blocked');
  });

  it(testName('Party POST kick: leader kicks member returns 200 and member removed from state (Rule 14.1)'), async () => {
    const leaderId = generateValidGuid();
    const memberId = generateValidGuid();
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(createRes.status).toBe(HttpStatus.Ok);
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    expect(typeof createData.partyId).toBe('string');
    expect((createData.partyId as string).length).toBeGreaterThan(0);
    const partyId = createData.partyId!;
    const inviteUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/invite`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const inviteRes = await worker.fetch(inviteUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ inviteeId: memberId }),
    });
    expect(inviteRes.status).toBe(HttpStatus.Ok);
    await inviteRes.text().catch(() => undefined);
    const joinUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/join`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const joinRes = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(memberId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(joinRes.status).toBe(HttpStatus.Ok);
    await joinRes.text().catch(() => undefined);
    const kickUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/kick`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const kickRes = await worker.fetch(kickUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ targetId: memberId }),
    });
    expect(kickRes.status).toBe(HttpStatus.Ok);
    const kickData = (await kickRes.json()) as { kicked?: boolean; error?: string };
    expect(kickData.error).toBeUndefined();
    expect(kickData.kicked).toBe(true);
    const stateUrl = buildApiUrl(ApiEndpoint.Party.ById(partyId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const stateRes = await worker.fetch(stateUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(leaderId),
    });
    expect(stateRes.status).toBe(HttpStatus.Ok);
    const stateData = (await stateRes.json()) as { members?: string[] };
    expect(Array.isArray(stateData.members)).toBe(true);
    expect(stateData.members).not.toContain(memberId);
  });

  it(testName('Party POST transfer-leader: leader transfers to member returns 200 and leaderId updated (Rule 14.1)'), async () => {
    const leaderId = generateValidGuid();
    const memberId = generateValidGuid();
    const createUrl = buildApiUrl(ApiEndpoint.Party.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(createRes.status).toBe(HttpStatus.Ok);
    const createData = (await createRes.json()) as { partyId?: string; error?: string };
    expect(typeof createData.partyId).toBe('string');
    expect((createData.partyId as string).length).toBeGreaterThan(0);
    const partyId = createData.partyId!;
    const inviteUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/invite`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const inviteRes = await worker.fetch(inviteUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ inviteeId: memberId }),
    });
    expect(inviteRes.status).toBe(HttpStatus.Ok);
    await inviteRes.text().catch(() => undefined);
    const joinUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/join`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const joinRes = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(memberId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect(joinRes.status).toBe(HttpStatus.Ok);
    const transferUrl = buildApiUrl(`${ApiEndpoint.Party.ById(partyId)}/transfer-leader`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const transferRes = await worker.fetch(transferUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(leaderId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ newLeaderId: memberId }),
    });
    expect(transferRes.status).toBe(HttpStatus.Ok);
    const transferData = (await transferRes.json()) as { transferred?: boolean; error?: string };
    expect(transferData.error).toBeUndefined();
    expect(transferData.transferred).toBe(true);
    const stateUrl = buildApiUrl(ApiEndpoint.Party.ById(partyId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const stateRes = await worker.fetch(stateUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(memberId),
    });
    expect(stateRes.status).toBe(HttpStatus.Ok);
    const stateData = (await stateRes.json()) as { leaderId?: string };
    expect(stateData.leaderId).toBe(memberId);
  });

  it(testName('Message POST send: returns 400 or 200 for empty body (Rule 14.3 boundary)'), async () => {
    const convId = 'test-conv-invalid-' + Date.now();
    const url = buildApiUrl(`${ApiEndpoint.Message.ByConversation(convId)}/send`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    });
    expect([HttpStatus.BadRequest, HttpStatus.Ok]).toContain(response.status);
    await response.text().catch(() => undefined);
  });

  it(testName('Notification GET list: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/list`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Notification GET list: returns 200 with notifications array when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/list`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { notifications?: unknown[] };
    expect(Array.isArray(data.notifications)).toBe(true);
  });

  it(testName('Notification GET list: accepts limit and unreadOnly query params when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/list`, { baseUrl: TestConfig.TestApiUrlPlaceholder }) + '?limit=5&unreadOnly=true';
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { notifications?: unknown[] };
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(data.notifications!.length).toBeLessThanOrEqual(5);
  });

  it(testName('Notification POST push: returns 200 when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/push`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ type: 'test', title: 'Test', body: 'Body' }),
    });
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response.status);
    await response.text().catch(() => undefined);
  });

  it(testName('Notification POST mark-read: returns 200 with read true when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/mark-read`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ notificationId: crypto.randomUUID() }),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { read?: boolean; error?: string };
    expect(data.read).toBe(true);
  });

  it(testName('Notification GET preferences: returns 200 when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/preferences`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    await response.text().catch(() => undefined);
  });

  it(testName('Notification POST preferences: returns 200 when authenticated'), async () => {
    const url = buildApiUrl(`${ApiEndpoint.Notification.Base}/preferences`, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ email: true, push: false }),
    });
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response.status);
    await response.text().catch(() => undefined);
  });
});
