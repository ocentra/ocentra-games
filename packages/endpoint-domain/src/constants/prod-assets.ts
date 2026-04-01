import type { ApiPath } from '@/types/brands';

export const ProdAssetsApiBase = '/api' as const;

export const ProdAssetsEndpoint = {
  Resources: `${ProdAssetsApiBase}/resources` as ApiPath,
  Logs: `${ProdAssetsApiBase}/logs` as ApiPath,
  LogsQuery: `${ProdAssetsApiBase}/logs/query` as ApiPath,
  LogsStats: `${ProdAssetsApiBase}/logs/stats` as ApiPath,
} as const;

export type ProdAssetsEndpointValue = typeof ProdAssetsEndpoint[keyof typeof ProdAssetsEndpoint];
