import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { FormField } from '@/constants/form-fields';
import { computeSha256 } from '@/utils/crypto-utils';
import { buildDisputeKey, buildEvidenceKey } from '@/utils/path-sanitizer';
import { extractAndValidateIdAfterEndpoint } from '@ocentra/endpoint-domain/utils/path-parser';
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

export async function handleDisputeRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
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
  const disputeId = result.id;
  const disputeKey = buildDisputeKey(disputeId);
  const storage = createDisputeStorage(env);

  if (request.method === HttpMethod.Get) {
    const getResult = await getDisputeLogic({ disputeId, disputeKey }, storage);

    if (!getResult.success) {
      if (getResult.error === 'Dispute not found') {
        return new Response(ErrorMessage.DisputeNotFound, {
          status: HttpStatus.NotFound,
          headers: getCorsHeaders(env),
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

  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put) {
    try {
      const body = await request.text();
      const dispute = JSON.parse(body);
      const updateResult = await updateDisputeLogic({ disputeId, disputeKey, disputeData: dispute }, storage);

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
          disputeId,
        }),
        {
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        }
      );
    } catch (error) {
      logError('Error updating dispute', getStackTrace(), error);
      return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
  }

  return new Response(ErrorMessage.MethodNotAllowed, { status: HttpStatus.MethodNotAllowed, headers: getCorsHeaders(env) });
}

async function handleDisputeEvidenceUpload(
  request: Request,
  env: Env,
  disputeId: string
): Promise<Response> {
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    let formData: FormData;
    const contentType = request.headers.get(HttpHeader.ContentType) || '';
    
    try {
      formData = await request.formData();
    } catch (formDataError) {
      if (formDataError instanceof Error && formDataError.message.includes('Content-Type')) {
        logError('[DISPUTES-EVIDENCE] FormData parsing failed due to Content-Type', getStackTrace(), {
          disputeId,
          contentType,
          error: formDataError.message,
          bodyType: typeof request.body,
          bodyUsed: request.bodyUsed
        });
        
        if (!request.bodyUsed) {
          try {
            const clonedRequest = request.clone();
            const bodyText = await clonedRequest.text();
            const looksLikeFormData = bodyText.includes('Content-Disposition: form-data') || 
                                      bodyText.includes('multipart/form-data') ||
                                      bodyText.includes('boundary=');
            
            logDebug('[DISPUTES-EVIDENCE] Body inspection after FormData parse failure', getStackTrace(), {
              disputeId,
              contentType,
              bodyLength: bodyText.length,
              bodyPreview: bodyText.substring(0, 200),
              looksLikeFormData
            }, true);
            
            if (looksLikeFormData) {
              logError('[DISPUTES-EVIDENCE] Body appears to be FormData but Content-Type is wrong - possible Content-Type header mismatch', getStackTrace(), {
                disputeId,
                contentType,
                expectedContentType: 'multipart/form-data with boundary'
              });
            }
          } catch (cloneError) {
            logError('[DISPUTES-EVIDENCE] Failed to inspect body after FormData parse failure', getStackTrace(), {
              disputeId,
              contentType,
              cloneError: cloneError instanceof Error ? cloneError.message : String(cloneError)
            });
          }
        }
        
        return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data for evidence upload' }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      throw formDataError;
    }
    const evidenceFiles: { name: string; key: string; size: number; hash?: string; type?: string }[] = [];

    const matchId = formData.get(FormField.MatchId) as string | null;
    const reason = formData.get(FormField.Reason) as string | null;
    const description = formData.get(FormField.Description) as string | null;

    const MAX_FILE_SIZE = 100 * 1024 * 1024;

    const metadataKeys = new Set<string>([FormField.MatchId, FormField.Reason, FormField.Description]);
    const processedKeys = new Set<string>();

    const storage = createDisputeStorage(env);
    const disputeKey = buildDisputeKey(disputeId);

    logDebug('[DISPUTES-EVIDENCE] Processing formData entries', getStackTrace(), { disputeId, formDataKeys: Array.from(formData.keys()) }, true);

    for (const [key, value] of formData.entries()) {
      if (metadataKeys.has(key) || processedKeys.has(key)) {
        continue
      }
      processedKeys.add(key)

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
        const evidenceKey = buildEvidenceKey(disputeId, file.name);

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
      }
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
  const authResult = await requireAuth(request, env, undefined, 'Authentication required to create disputes');
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const contentType = request.headers.get(HttpHeader.ContentType) || '';
    
    let isFormData = contentType.includes(HttpContentType.MultipartFormData);
    
    if (!isFormData) {
      try {
        const testFormData = await request.clone().formData();
        const firstEntry = testFormData.entries().next();
        if (!firstEntry.done) {
          isFormData = true;
          logDebug('[DISPUTES-CREATE] Detected FormData despite missing Content-Type header', getStackTrace(), { contentType }, true);
        }
      } catch {
        isFormData = false;
      }
    }
    
    if (isFormData) {
      const disputeId = `dispute-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      return handleDisputeEvidenceUpload(request, env, disputeId);
    }

    const body = await request.text();
    let disputeData;
    try {
      disputeData = JSON.parse(body);
    } catch (parseError) {
      logError('[DISPUTES-CREATE] Failed to parse request body as JSON', getStackTrace(), { 
        contentType, 
        bodyLength: body.length,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid request body. Expected JSON or multipart/form-data.' 
      }), {
        status: HttpStatus.BadRequest,
        headers: { 
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson, 
          ...getCorsHeaders(env) 
        }
      });
    }

    const disputeId = disputeData.dispute_id || `dispute-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const disputeKey = buildDisputeKey(disputeId);
    const storage = createDisputeStorage(env);

    const createResult = await createDisputeLogic(
      {
        disputeId,
        disputeKey,
        userId: authResult.userId,
        disputeData,
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
