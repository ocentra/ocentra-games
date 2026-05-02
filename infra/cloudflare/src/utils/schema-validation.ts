import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';


export async function validateSchemaBody<T>(
  request: Request,
  env: Env,
  schema: { safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: unknown[] } } }
): Promise<{ data?: T; errorResponse?: Response }> {
  try {
    const json = request.method === HttpMethod.Post
      || request.method === HttpMethod.Put
      || request.method === HttpMethod.Patch
      || request.method === HttpMethod.Delete
      ? await (async () => {
        const text = await request.clone().text();
        if (text.trim() === '') return {};
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return Symbol('invalid-json');
        }
      })()
      : {};

    if (typeof json === 'symbol') {
      return {
        errorResponse: new Response(
          JSON.stringify({ success: false, error: ErrorMessage.BadRequest, message: 'Invalid JSON body', issues: [] }),
          { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env, request.headers.get(HttpHeader.Origin) || undefined) } }
        ),
      };
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return {
        errorResponse: new Response(
          JSON.stringify({
            success: false,
            error: ErrorMessage.BadRequest,
            message: 'Invalid request payload',
            issues: parsed.error.issues,
          }),
          { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env, request.headers.get(HttpHeader.Origin) || undefined) } }
        ),
      };
    }
    return { data: parsed.data };
  } catch {
    return {
      errorResponse: new Response(
        JSON.stringify({ success: false, error: ErrorMessage.BadRequest, message: 'Invalid JSON body', issues: [] }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env, request.headers.get(HttpHeader.Origin) || undefined) } }
      ),
    };
  }
}
