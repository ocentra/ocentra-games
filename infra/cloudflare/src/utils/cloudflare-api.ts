import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com';
const CLOUDFLARE_ANALYTICS_ENGINE_SQL_PATH = (accountId: string) => `/client/v4/accounts/${accountId}/analytics_engine/sql`;

export function getAnalyticsEngineSqlUrl(accountId: string): string {
  return buildFullUrl(CLOUDFLARE_ANALYTICS_ENGINE_SQL_PATH(accountId), { baseUrl: CLOUDFLARE_API_BASE });
}
