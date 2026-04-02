import { buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';

export const AUTH_PROBE_URL = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);

export function authProbeRequestInit(headers: Record<string, string>, body = '{}'): RequestInit {
  return {
    method: HttpMethod.Post,
    headers: {
      ...headers,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body,
  };
}
