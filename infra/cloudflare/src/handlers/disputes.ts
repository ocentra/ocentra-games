import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { FormField } from '@/constants/form-fields';
import { computeSha256 } from '@/utils/crypto-utils';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { buildDisputeKey, buildEvidenceKey } from '@/utils/path-sanitizer';
import { extractAndValidateIdAfterEndpoint } from '@ocentra/endpoint-domain/utils/path-parser';
import { validateMatchId } from '@ocentra/endpoint-domain/constants/match';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  getDisputeLogic,
  createDisputeLogic,
  updateDisputeLogic,
  updateDisputeWithEvidenceLogic,
  uploadEvidenceFileLogic,
  type DisputeStorage,
} from '@/logic/disputes';

import {
  CreateDisputeRequestSchema,
  UpdateDisputeRequestSchema,
} from '@ocentra/endpoint-domain/schemas/disputes';
import { DisputeIdSchema } from '@ocentra/endpoint-domain/schemas/common';
import { validateZodBody } from '@/utils/zod-validation';

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

function createDisputeStorage(env: Env): DisputeStorage {
  return {
    async get(key: string) {
      return await env.MATCHES_BUCKET.get(key);
    },
    async put(key: string, body: string | ArrayBuffer, options?: { httpMetadata?: { contentType: string } }) {
      await env.MATCHES_BUCKET.put(key, body, {
        httpMetadata: {
          contentType: options?.httpMetadata?.contentType || HttpContentType.ApplicationJson,
        },
      });
    },
  };
}

function isPrintableAscii(value: string): boolean {
  return /^[\x20-\x7E]+$/.test(value);
}

function normalizeDisputeReason(reason: string): string {
  switch (reason) {
    case 'Cheating detected':
      return 'cheating';
    case 'Bug':
      return 'bug';
    case 'Disconnection':
      return 'disconnection';
    case 'Other':
      return 'other';
    default:
      return reason;
  }
}

function validateEvidenceMetadataField(value: unknown, fieldName: string, requireMatchId: boolean = false): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (value.length < 1) {
    return `${fieldName} must be a non-empty string`;
  }

  if (!isPrintableAscii(value)) {
    return `${fieldName} must contain printable ASCII characters only`;
  }

  if (requireMatchId) {
    const matchIdValidation = validateMatchId(value);
    if (!matchIdValidation.valid) {
      return matchIdValidation.error || `${fieldName} is invalid`;
    }
  }

  return null;
}

export async function handleDisputeRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const allowedMethods = path === ApiEndpoint.Disputes.Base
    ? [HttpMethod.Post]
    : path.includes('/evidence')
      ? [HttpMethod.Post]
      : [HttpMethod.Get, HttpMethod.Put];
  const methodCheck = rejectUnsupportedMethod(request, env, allowedMethods);
  if (methodCheck) {
    return methodCheck;
  }

  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Delete) {
    const authResult = await requireAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
  }

  if (path === ApiEndpoint.Disputes.Base && request.method === HttpMethod.Post) {
    return handleCreateDispute(request, env);
  }

  const requestUrl = new URL(request.url);
  const urlPath = requestUrl.pathname;
  if (requestUrl.searchParams.size > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Dispute requests must not include query parameters',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (request.method === HttpMethod.Get) {
    const bodyText = await request.clone().text();
    if (bodyText.length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Dispute read requests must not include a request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
  }

  const isEvidenceUpload =
    request.method === HttpMethod.Post &&
    path.startsWith(ApiEndpoint.Disputes.Base) &&
    path.includes('/evidence') &&
    path.length > ApiEndpoint.Disputes.Base.length + 2;

  if (isEvidenceUpload) {
    const validationStart = Date.now();
  const result = extractAndValidateIdAfterEndpoint(path, ApiEndpoint.Disputes.Base, 'disputeId', ApiEndpoint.Disputes.Evidence(':disputeId'), request.url);
    const validationTime = Date.now() - validationStart;

    if (validationTime > 100) {
      logWarn('[DISPUTES-EVIDENCE] Path validation took longer than expected', getStackTrace(), {
        path,
        validationTime,
        result: result.error || result.id
      }, true);
    }

    if (result.error || !result.id) {
      logDebug('[DISPUTES-EVIDENCE] Path validation failed', getStackTrace(), {
        path,
        error: result.error,
        validationTime
      }, true);

      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: result.error || ErrorMessage.DisputeIdRequired
      }), { status: HttpStatus.BadRequest, headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    if (!DisputeIdSchema.safeParse(result.id).success) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'disputeId must contain only letters, numbers, underscores, and hyphens',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    return handleDisputeEvidenceUpload(request, env, result.id);
  }

  const validationStart = Date.now();
  const result = extractAndValidateIdAfterEndpoint(path, ApiEndpoint.Disputes.Base, 'disputeId', undefined, request.url);
  const validationTime = Date.now() - validationStart;

  if (validationTime > 100) {
    logWarn('[DISPUTES] Path validation took longer than expected', getStackTrace(), {
      path,
      validationTime,
      result: result.error || result.id
    }, true);
  }

  if (result.error || !result.id) {
    logDebug('[DISPUTES] Path validation failed', getStackTrace(), {
      path,
      error: result.error,
      validationTime
    }, true);

    if (path.startsWith(ApiEndpoint.Disputes.Base) || urlPath.startsWith(ApiEndpoint.Disputes.Base)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: result.error || ErrorMessage.DisputeIdRequired
      }), { status: HttpStatus.BadRequest, headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    return new Response(ErrorMessage.BadRequest, { status: HttpStatus.BadRequest, headers: getCorsHeaders(env) });
  }
  if (!DisputeIdSchema.safeParse(result.id).success) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'disputeId must contain only letters, numbers, underscores, and hyphens',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  const disputeId = result.id;
  if (requestUrl.pathname.includes('%')) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'disputeId must not contain encoded characters',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  let disputeKey: string;
  try {
    disputeKey = buildDisputeKey(disputeId);
  } catch (error) {
    logError('[DISPUTES] Failed to sanitize dispute path components', getStackTrace(), {
      disputeId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: ErrorMessage.PathComponentBecameEmptyAfterSanitization,
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  const storage = createDisputeStorage(env);

  if (request.method !== HttpMethod.Get && request.method !== HttpMethod.Put) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: [HttpMethod.Get, HttpMethod.Put].join(', '),
        ...getCorsHeaders(env),
      },
    });
  }

  if (request.method === HttpMethod.Get) {
    const getResult = await getDisputeLogic({ disputeId, disputeKey }, storage);

    if (!getResult.success) {
      if (getResult.error === 'Dispute not found') {
        return new Response(JSON.stringify({ error: ErrorMessage.DisputeNotFound, message: ErrorMessage.DisputeNotFound }), {
          status: HttpStatus.NotFound,
          headers: {
            ...getCorsHeaders(env),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
        });
      }
      return new Response(JSON.stringify({ error: getResult.error }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(JSON.stringify(getResult.dispute), {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (request.method === HttpMethod.Put) {
    const validation = await validateZodBody(
      request,
      env,
      UpdateDisputeRequestSchema
    );

    if (validation.errorResponse) return validation.errorResponse;
    const body = validation.data!;
    const normalizedBody = {
      ...body,
      reason: normalizeDisputeReason(body.reason as string),
    };

    const updateResult = await updateDisputeLogic({ disputeId, disputeKey, disputeData: normalizedBody as Record<string, unknown> }, storage);

    if (!updateResult.success) {
      if (updateResult.error === ErrorMessage.DisputeNotFound) {
        return new Response(JSON.stringify({ error: ErrorMessage.DisputeNotFound, message: ErrorMessage.DisputeNotFound }), {
          status: HttpStatus.NotFound,
          headers: {
            ...getCorsHeaders(env),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
        });
      }
      return new Response(JSON.stringify({ error: updateResult.error }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        disputeId,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  }

  return new Response(ErrorMessage.MethodNotAllowed, {
    status: HttpStatus.MethodNotAllowed,
    headers: {
      [HttpHeader.Allow]: [HttpMethod.Get, HttpMethod.Put].join(', '),
      ...getCorsHeaders(env),
    },
  });
}

async function handleDisputeEvidenceUpload(
  request: Request,
  env: Env,
  disputeId: string
): Promise<Response> {
  if (request.method !== HttpMethod.Post) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env),
      },
    });
  }

  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const contentType = request.headers.get(HttpHeader.ContentType) || '';

    if (!contentType.includes(HttpContentType.MultipartFormData)) {
      return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data for evidence upload' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch (formDataError) {
      logError('[DISPUTES-EVIDENCE] FormData parsing failed', getStackTrace(), {
        disputeId,
        contentType,
        error: formDataError instanceof Error ? formDataError.message : String(formDataError),
      });

      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Invalid multipart/form-data request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const evidenceFiles: { name: string; key: string; size: number; hash?: string; type?: string }[] = [];

    const hasMatchId = formData.has(FormField.MatchId);
    const hasReason = formData.has(FormField.Reason);
    const hasDescription = formData.has(FormField.Description);
    const matchIdValue = formData.get(FormField.MatchId);
    const reasonValue = formData.get(FormField.Reason);
    const descriptionValue = formData.get(FormField.Description);

    if (hasMatchId) {
      const matchIdValidation = validateEvidenceMetadataField(matchIdValue, FormField.MatchId, true);
      if (matchIdValidation) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: matchIdValidation,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    if (hasReason) {
      const reasonValidation = validateEvidenceMetadataField(reasonValue, FormField.Reason);
      if (reasonValidation) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: reasonValidation,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    if (hasDescription) {
      const descriptionValidation = validateEvidenceMetadataField(descriptionValue, FormField.Description);
      if (descriptionValidation) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: descriptionValidation,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    const matchId = hasMatchId && typeof matchIdValue === 'string' ? matchIdValue : null;
    const reason = hasReason && typeof reasonValue === 'string' ? reasonValue : null;
    const description = hasDescription && typeof descriptionValue === 'string' ? descriptionValue : null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024;

    const metadataKeys = new Set<string>([FormField.MatchId, FormField.Reason, FormField.Description]);

    const storage = createDisputeStorage(env);
    let disputeKey: string;
    try {
      disputeKey = buildDisputeKey(disputeId);
    } catch (error) {
      logError('[DISPUTES-EVIDENCE] Failed to sanitize dispute path components', getStackTrace(), {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: ErrorMessage.PathComponentBecameEmptyAfterSanitization,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    logDebug('[DISPUTES-EVIDENCE] Processing formData entries', getStackTrace(), { disputeId, formDataKeys: Array.from(formData.keys()) }, true);

    for (const [key, value] of formData.entries()) {
      if (metadataKeys.has(key)) {
        continue;
      }

      if (typeof value === 'string') {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: `Unexpected field: ${key}`,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      if (key !== FormField.Evidence) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: `Unexpected field: ${key}`,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      logDebug('[DISPUTES-EVIDENCE] Processing formData entry', getStackTrace(), { key, valueType: typeof value, hasName: value && typeof value === 'object' ? 'name' in value : false, hasArrayBuffer: value && typeof value === 'object' ? 'arrayBuffer' in value : false }, true);

      if (value && typeof value === 'object' && 'name' in value && 'arrayBuffer' in value) {
        const file = value as File;

        if (file.size > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: `File ${file.name} exceeds maximum size of 100MB` }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env),
            },
          });
        }

        const fileType = file.type || HttpContentType.OctetStream;
        const fileData = await file.arrayBuffer();
        const hashHex = await computeSha256(fileData);
        let evidenceKey: string;
        try {
          evidenceKey = buildEvidenceKey(disputeId, file.name);
        } catch (error) {
          logError('[DISPUTES-EVIDENCE] Failed to sanitize evidence path components', getStackTrace(), {
            disputeId,
            fileName: file.name,
            error: error instanceof Error ? error.message : String(error),
          });
          return new Response(JSON.stringify({
            error: ErrorMessage.BadRequest,
            message: ErrorMessage.PathComponentBecameEmptyAfterSanitization,
          }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env),
            },
          });
        }

        const uploadResult = await uploadEvidenceFileLogic(
          {
            disputeId,
            disputeKey,
            evidenceKey,
            file: {
              name: file.name,
              data: fileData,
              type: fileType,
              size: fileData.byteLength,
            },
            hash: hashHex,
          },
          storage
        );

        if (!uploadResult.success) {
          return new Response(JSON.stringify({ error: uploadResult.error }), {
            status: HttpStatus.InternalServerError,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env),
            },
          });
        }

        evidenceFiles.push(uploadResult.file);
        continue;
      }

      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: `Unexpected field: ${key}`,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    logDebug('[DISPUTES-EVIDENCE] Finished processing files', getStackTrace(), { disputeId, evidenceFilesCount: evidenceFiles.length }, true);

    if (evidenceFiles.length === 0) {
      logError('[DISPUTES-EVIDENCE] No files detected in formData', getStackTrace(), {
        disputeId,
        formDataKeys: Array.from(formData.keys()),
        metadataKeys: Array.from(metadataKeys)
      });
      return new Response(JSON.stringify({ error: 'No evidence files found in request' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const newEvidence = evidenceFiles.map(f => ({
      filename: f.name,
      type: f.type || HttpContentType.OctetStream,
      size_bytes: f.size,
      hash: f.hash || '',
      url: f.key,
      uploaded_at: new Date().toISOString(),
    }));

    const allHashes = newEvidence.map(e => e.hash).join(',');
    const packageHashHex = await computeSha256(allHashes);

    const updateResult = await updateDisputeWithEvidenceLogic(
      {
        disputeId,
        disputeKey,
        matchId,
        reason,
        description,
        newEvidence,
        packageHash: packageHashHex,
      },
      storage
    );

    if (!updateResult.success) {
      return new Response(JSON.stringify({ error: updateResult.error }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dispute_id: disputeId,
        evidence_package_hash: updateResult.evidence_package_hash,
        evidence_files: updateResult.evidence_files,
        evidence: updateResult.evidence,
        uploaded_at: new Date().toISOString(),
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  } catch (error) {
    logError('[DISPUTES-EVIDENCE-UPLOAD-FAILURE] Error in disputes evidence upload handler', getStackTrace(), {
      disputeId,
      error: String(error),
      errorMessage: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}

async function handleCreateDispute(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== HttpMethod.Post) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env),
      },
    });
  }

  const authResult = await requireAuth(request, env, undefined, 'Authentication required to create disputes');
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const contentType = request.headers.get(HttpHeader.ContentType) || '';

    if (contentType.includes(HttpContentType.MultipartFormData)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Create dispute expects JSON. Use /api/v1/disputes/{disputeId}/evidence for multipart uploads.',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const validation = await validateZodBody(request, env, CreateDisputeRequestSchema);

    if (validation.errorResponse) return validation.errorResponse;
    const body = validation.data!;
    const normalizedBody = {
      ...body,
      reason: normalizeDisputeReason(body.reason as string),
    };

    const disputeId = body.dispute_id || `dispute-${Date.now()}-${crypto.randomUUID()}`;
    let disputeKey: string;
    try {
      disputeKey = buildDisputeKey(disputeId);
    } catch (error) {
      logError('[DISPUTES-CREATE] Failed to sanitize dispute path components', getStackTrace(), {
        disputeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: ErrorMessage.PathComponentBecameEmptyAfterSanitization,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const storage = createDisputeStorage(env);

    const createResult = await createDisputeLogic(
      {
        disputeId,
        disputeKey,
        userId: authResult.userId,
        disputeData: normalizedBody as Record<string, unknown>,
      },
      storage
    );

    if (!createResult.success) {
      return new Response(JSON.stringify({ error: createResult.error }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        disputeId: createResult.disputeId,
        dispute: createResult.dispute,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  } catch (error) {
    logError('Error creating dispute', getStackTrace(), { error });
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
