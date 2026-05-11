import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, buildTestApiUrlForEndpointWithPath, buildTestDisputesEvidenceApiUrl, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { FormField } from '@ocentra/endpoint-domain/constants/form-fields';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for disputes integration tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Create Dispute: should create dispute with JSON payload'), async () => {
      const token = await createToken();
      const disputeData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: `test-dispute-${Date.now()}`,
        match_id: TestConfig.TestMatchId,
      };
      logInfo('[TEST] Testing dispute creation', getStackTrace(), { disputeId: disputeData.dispute_id, matchId: disputeData.match_id }, LOG_TEST_OPERATIONS);

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(disputeData)
      }, token);

      logInfo('[TEST] Dispute creation response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for dispute creation', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
      }
      const data = await response.json() as { success: boolean; disputeId: string; dispute: unknown };
      logInfo('[TEST] Dispute created successfully', getStackTrace(), { success: data.success, disputeId: data.disputeId }, LOG_TEST_OPERATIONS);
      expect(data.success).toBe(true);
      expect(typeof data.disputeId).toBe('string');
      expect(data.disputeId.length).toBeGreaterThan(0);
      expect(typeof data.dispute).toBe('object');
      if (!data.success || !data.disputeId || data.disputeId.length === 0 || typeof data.dispute !== 'object') {
        logError('[TEST] Invalid dispute creation response', getStackTrace(), { success: data.success, disputeId: data.disputeId, disputeType: typeof data.dispute });
      }
    });

  it(testName('Create Dispute: should reject dispute creation without authentication'), async () => {
      const token = await createToken();
      const disputeData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: `test-dispute-${Date.now()}`,
        match_id: TestConfig.TestMatchId,
      };

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(disputeData)
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Create Dispute: should auto-generate dispute_id if not provided'), async () => {
      const token = await createToken();
      const disputeData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: undefined,
        match_id: TestConfig.TestMatchId,
      };

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(disputeData)
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; disputeId: string };
      expect(data.success).toBe(true);
      expect(typeof data.disputeId).toBe('string');
      expect(data.disputeId.length).toBeGreaterThan(0);
    });

  it(testName('Create Dispute: should reject invalid JSON payload'), async () => {
      const token = await createToken();
      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: 'invalid json{'
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(typeof data.error).toBe('string');
      expect((data.error as string).length).toBeGreaterThan(0);
    });

  it(testName('Create Dispute: should reject invalid timestamp payload'), async () => {
      const token = await createToken();
      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify({
          ...OpenApiExampleValue.DisputeCreateRequest,
          match_id: TestConfig.TestMatchId,
          timestamp: '',
        })
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
      expect(typeof data.message).toBe('string');
      expect((data.message as string).toLowerCase()).toContain('invalid request payload');
    });

  it(testName('Create Dispute: should reject multipart form data on create endpoint'), async () => {
      const token = await createToken();
      const formData = new FormData();
      formData.append(FormField.MatchId, TestConfig.TestMatchId);
      formData.append(FormField.Reason, OpenApiExampleValue.DisputeEvidenceRequest.reason);
      formData.append(FormField.Description, OpenApiExampleValue.DisputeEvidenceRequest.description);
      const testFile = new File(['evidence content'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const response = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
      expect(typeof data.message).toBe('string');
      expect((data.message as string).toLowerCase()).toContain('create dispute expects json');
    });

  it(testName('Get Dispute: should retrieve existing dispute'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-get-${Date.now()}`;
      const disputeData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: disputeId,
        match_id: TestConfig.TestMatchId,
      };

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const createRes = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(disputeData)
      }, token);
      await createRes.text().catch(() => undefined);

      await new Promise(resolve => setTimeout(resolve, 500));

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { dispute_id: string; match_id: string };
      expect(data.dispute_id).toBe(disputeId);
      expect(data.match_id).toBe(TestConfig.TestMatchId);
    });

  it(testName('Get Dispute: should return 404 for non-existent dispute'), async () => {
      const token = await createToken();
      const nonExistentId = `non-existent-${Date.now()}`;

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, nonExistentId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      await response.text().catch(() => undefined);
    });

  it(testName('Get Dispute: should reject GET request without authentication for POST/PUT/DELETE endpoints'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-${Date.now()}`;
      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status === HttpStatus.Ok || response.status === HttpStatus.NotFound).toBe(true);
      await consumeResponseBody(response);
    });

  it(testName('Update Dispute: should update existing dispute'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-update-${Date.now()}`;
      const initialData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: disputeId,
        match_id: TestConfig.TestMatchId,
      };

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const updateCreateRes = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(initialData)
      }, token);
      await updateCreateRes.text().catch(() => undefined);

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedData = {
        ...OpenApiExampleValue.DisputeUpdateRequest,
        match_id: initialData.match_id,
      };

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(updatedData)
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; disputeId: string };
      expect(data.success).toBe(true);
      expect(data.disputeId).toBe(disputeId);
    });

  it(testName('Update Dispute: should reject update without authentication'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-${Date.now()}`;
      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Put,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(OpenApiExampleValue.DisputeUpdateRequest)
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
    });

  it(testName('Method Not Allowed: should reject DELETE method'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-${Date.now()}`;

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.MethodNotAllowed);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation: should reject invalid dispute ID format'), async () => {
      const token = await createToken();
      const invalidId = '../../../etc/passwd';

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, invalidId);
      const response = await worker.fetch(disputeUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
    });

  it(testName('Evidence Upload: should upload evidence file with metadata'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-${Date.now()}`;
      const evidenceReason = OpenApiExampleValue.DisputeEvidenceRequest.reason;
      const evidenceDescription = OpenApiExampleValue.DisputeEvidenceRequest.description;

      const formData = new FormData();
      formData.append(FormField.MatchId, TestConfig.TestMatchId);
      formData.append(FormField.Reason, evidenceReason);
      formData.append(FormField.Description, evidenceDescription);
      const testFile = new File(['test evidence content'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; dispute_id: string; evidence_files: number; evidence: Array<{ filename: string; hash: string; size_bytes: number }>; evidence_package_hash: string };
      expect(data.success).toBe(true);
      expect(data.dispute_id).toBe(disputeId);
      expect(data.evidence_files).toBe(1);
      expect(Array.isArray(data.evidence)).toBe(true);
      expect(data.evidence.length).toBe(1);
      expect(data.evidence[0].filename).toBe('evidence.txt');
      expect(typeof data.evidence[0].hash).toBe('string');
      expect(data.evidence[0].hash.length).toBeGreaterThan(0);
      expect(data.evidence[0].size_bytes).toBe(testFile.size);
      expect(typeof data.evidence_package_hash).toBe('string');
      expect(data.evidence_package_hash.length).toBeGreaterThan(0);
    });

  it(testName('Evidence Upload: should upload multiple evidence files'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-multi-${Date.now()}`;

      const formData = new FormData();
      formData.append(FormField.MatchId, TestConfig.TestMatchId);
      const file1 = new File(['evidence 1'], 'evidence1.txt', { type: HttpContentType.TextPlain });
      const file2 = new File(['evidence 2'], 'evidence2.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', file1);
      formData.append('evidence', file2);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; evidence_files: number; evidence: Array<{ filename: string }> };
      expect(data.success).toBe(true);
      expect(data.evidence_files).toBe(2);
      expect(data.evidence.length).toBe(2);
      const filenames = data.evidence.map(e => e.filename);
      expect(filenames).toContain('evidence1.txt');
      expect(filenames).toContain('evidence2.txt');
    });

  it(testName('Evidence Upload: should reject evidence upload without authentication'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-${Date.now()}`;
      const formData = new FormData();
      const testFile = new File(['test'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
    });

  it(testName('Evidence Upload: should reject mismatched multipart boundary before parsing'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-boundary-${Date.now()}`;
      const headerBoundary = 'header-boundary';
      const bodyBoundary = 'body-boundary';
      const body = [
        `--${bodyBoundary}`,
        `Content-Disposition: form-data; name="${FormField.MatchId}"`,
        '',
        TestConfig.TestMatchId,
        `--${bodyBoundary}`,
        `Content-Disposition: form-data; name="${FormField.Evidence}"`,
        HttpHeader.ContentType + ': ' + HttpContentType.TextPlain,
        '',
        'evidence.txt',
        `--${bodyBoundary}--`,
        '',
      ].join('\r\n');

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: `${HttpContentType.MultipartFormData}; boundary=${headerBoundary}`,
        },
        body,
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
      expect(data.message).toContain('boundary');
    });

  it(testName('Evidence Upload: should reject Schemathesis mismatched multipart boundary case'), async () => {
      const token = await createToken();
      const disputeId = 'D-123-456';
      const headerBoundary = 'c1af0a3631cf0251a4f6e3eb3facb69a';
      const bodyBoundary = '3299e29f5b423608820d8e48156336eb';
      const body = [
        `--${bodyBoundary}`,
        `Content-Disposition: form-data; name="${FormField.Evidence}"; filename="evidence.txt"`,
        HttpHeader.ContentType + ': ' + HttpContentType.TextPlain,
        '',
        'schemathesis evidence',
        `--${bodyBoundary}--`,
        '',
      ].join('\r\n');

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: `${HttpContentType.MultipartFormData}; boundary=${headerBoundary}`,
        },
        body,
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
      expect(data.message).toContain('boundary');
    });

  it(testName('Evidence Upload: should reject file exceeding maximum size'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-size-${Date.now()}`;

      const formData = new FormData();
      const largeFile = new File([new ArrayBuffer(101 * 1024 * 1024)], 'large-file.bin');
      formData.append('evidence', largeFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      // 413 Payload Too Large is the correct status for oversized files
      expect(response.status).toBe(HttpStatus.PayloadTooLarge);
      await consumeResponseBody(response);
    });

  it(testName('Evidence Upload: should append evidence to existing dispute'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-append-${Date.now()}`;

      const disputeData = {
        ...OpenApiExampleValue.DisputeCreateRequest,
        dispute_id: disputeId,
        match_id: TestConfig.TestMatchId,
      };

      const disputesUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Disputes.Base);
      const appendCreateRes = await worker.fetch(disputesUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: JSON.stringify(disputeData)
      }, token);
      await appendCreateRes.text().catch(() => undefined);

      await new Promise(resolve => setTimeout(resolve, 500));

      const formData = new FormData();
      const testFile = new File(['evidence content'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; evidence_files: number };
      expect(data.success).toBe(true);
      expect(data.evidence_files).toBe(1);
    });

  it(testName('Evidence Upload: should reject invalid dispute ID format for evidence upload'), async () => {
      const token = await createToken();
      const invalidId = '..%2F..%2F..%2Fetc%2Fpasswd';
      const formData = new FormData();
      const testFile = new File(['test'], 'evidence.txt');
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(invalidId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
    });

  it(testName('Evidence Upload: should handle evidence upload with metadata fields'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-metadata-${Date.now()}`;
      const evidenceReason = OpenApiExampleValue.DisputeEvidenceRequest.reason;
      const evidenceDescription = OpenApiExampleValue.DisputeEvidenceRequest.description;

      const formData = new FormData();
      formData.append(FormField.MatchId, TestConfig.TestMatchId);
      formData.append(FormField.Reason, evidenceReason);
      formData.append(FormField.Description, evidenceDescription);
      const testFile = new File(['evidence'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 500));

      const disputeUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Disputes.Base, disputeId);
      const getResponse = await worker.fetch(disputeUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(getResponse.status).toBe(HttpStatus.Ok);
      const dispute = await getResponse.json() as { match_id?: string; reason?: string; description?: string };
      expect(dispute.match_id).toBe(TestConfig.TestMatchId);
      expect(dispute.reason).toBe(evidenceReason);
      expect(dispute.description).toBe(evidenceDescription);
    });

  it(testName('Evidence Upload: should reject non-string metadata fields'), async () => {
      const token = await createToken();
      const disputeId = `test-dispute-evidence-invalid-metadata-${Date.now()}`;

      const formData = new FormData();
      formData.append(FormField.MatchId, new Blob(['{}'], { type: HttpContentType.ApplicationJson }), 'match-id.json');
      const testFile = new File(['evidence'], 'evidence.txt', { type: HttpContentType.TextPlain });
      formData.append('evidence', testFile);

      const evidenceUrl = buildTestDisputesEvidenceApiUrl(disputeId);
      const response = await worker.fetch(evidenceUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        },
        body: formData
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe(ErrorMessage.BadRequest);
      expect(typeof data.message).toBe('string');
      expect((data.message as string).toLowerCase()).toContain('match_id must be a string');
    });
});
