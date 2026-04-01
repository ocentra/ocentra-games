import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';

export interface EndpointConfig {
  name: string;
  path: string;
  methods: HttpMethod[];
  pathParams?: string[];
  queryParams?: string[];
  requiresAuth: boolean;
  requiresAdmin: boolean;
  requiresWallet?: boolean;
  supportsBody: boolean;
  testIdGenerator?: () => string;
  skipSecurityTests?: boolean;
}

export const ENDPOINT_REGISTRY: EndpointConfig[] = [
  {
    name: 'Root',
    path: ApiEndpoint.Root,
    methods: [HttpMethod.Get],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
  },
  {
    name: 'Health',
    path: ApiEndpoint.Health,
    methods: [HttpMethod.Get],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
  },
  {
    name: 'Resources',
    path: ApiEndpoint.Resources.Base,
    methods: [HttpMethod.Get, HttpMethod.Post, HttpMethod.Put],
    queryParams: ['guid', 'hash', 'checksum', 'action', 'type'],
    requiresAuth: true,
    requiresAdmin: true,
    requiresWallet: true,
    supportsBody: true,
    testIdGenerator: () => 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee',
  },
  {
    name: 'ResourcesGetByGuid',
    path: ApiEndpoint.Resources.Base,
    methods: [HttpMethod.Get],
    queryParams: ['guid'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee',
  },
  {
    name: 'ResourcesGetByHash',
    path: ApiEndpoint.Resources.Base,
    methods: [HttpMethod.Get],
    queryParams: ['hash'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'a'.repeat(64),
  },
  {
    name: 'Assets',
    path: `${ApiEndpoint.Assets.Base}/{path}`,
    methods: [HttpMethod.Get, HttpMethod.Put],
    pathParams: ['path'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
    testIdGenerator: () => 'test-asset.asset',
  },
  {
    name: 'Matches',
    path: `${ApiEndpoint.Matches.Base}/{matchId}`,
    methods: [HttpMethod.Get, HttpMethod.Put, HttpMethod.Delete],
    pathParams: ['matchId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
    testIdGenerator: () => 'test-match-123',
  },
  {
    name: 'Disputes',
    path: `${ApiEndpoint.Disputes.Base}/{disputeId}`,
    methods: [HttpMethod.Get, HttpMethod.Post],
    pathParams: ['disputeId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
    testIdGenerator: () => 'test-dispute-123',
  },
  {
    name: 'DisputesEvidence',
    path: `${ApiEndpoint.Disputes.Base}/{disputeId}/evidence`,
    methods: [HttpMethod.Post],
    pathParams: ['disputeId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
    testIdGenerator: () => 'test-dispute-123',
  },
  {
    name: 'SignedUrl',
    path: `${ApiEndpoint.SignedUrl.Base}/{matchId}`,
    methods: [HttpMethod.Get],
    pathParams: ['matchId'],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-match-123',
  },
  {
    name: 'Archive',
    path: `${ApiEndpoint.Archive.Base}/{matchId}`,
    methods: [HttpMethod.Post],
    pathParams: ['matchId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-match-123',
  },
  {
    name: 'DataExport',
    path: `${ApiEndpoint.DataExport.Base}/{userId}`,
    methods: [HttpMethod.Get],
    pathParams: ['userId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-user-123',
  },
  {
    name: 'DataDelete',
    path: `${ApiEndpoint.Data.Base}/{userId}`,
    methods: [HttpMethod.Delete],
    pathParams: ['userId'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-user-123',
  },
  {
    name: 'Leaderboard',
    path: `${ApiEndpoint.Leaderboard.Base}/{game_type}`,
    methods: [HttpMethod.Get],
    pathParams: ['game_type'],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-game',
  },
  {
    name: 'AI',
    path: ApiEndpoint.AI.Base,
    methods: [HttpMethod.Post],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
  },
  {
    name: 'AIOnEvent',
    path: ApiEndpoint.AI.OnEvent,
    methods: [HttpMethod.Post],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
  },
  {
    name: 'Logs',
    path: ApiEndpoint.Logs.Base,
    methods: [HttpMethod.Get, HttpMethod.Post],
    queryParams: ['source', 'context', 'since', 'limit'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: true,
  },
  {
    name: 'LogsPath',
    path: `${ApiEndpoint.Logs.Base}/{path}`,
    methods: [HttpMethod.Get],
    pathParams: ['path'],
    requiresAuth: true,
    requiresAdmin: false,
    supportsBody: false,
    testIdGenerator: () => 'test-path',
  },
  {
    name: 'ExploreMatches',
    path: ApiEndpoint.ExploreApi.Matches,
    methods: [HttpMethod.Get],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
  },
  {
    name: 'Metrics',
    path: ApiEndpoint.Metrics,
    methods: [HttpMethod.Get],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
  },
  {
    name: 'ImageProxy',
    path: ApiEndpoint.ImageProxy,
    methods: [HttpMethod.Get],
    queryParams: ['url'],
    requiresAuth: false,
    requiresAdmin: false,
    supportsBody: false,
    skipSecurityTests: true,
  },
];

export function getEndpointsByParamType(paramType: 'path' | 'query' | 'header'): EndpointConfig[] {
  if (paramType === 'path') {
    return ENDPOINT_REGISTRY.filter(e => e.pathParams && e.pathParams.length > 0);
  }
  if (paramType === 'query') {
    return ENDPOINT_REGISTRY.filter(e => e.queryParams && e.queryParams.length > 0);
  }
  return ENDPOINT_REGISTRY.filter(e => e.requiresAuth || e.requiresWallet);
}

export function getEndpointsRequiringAuth(): EndpointConfig[] {
  return ENDPOINT_REGISTRY.filter(e => e.requiresAuth);
}

export function getAllEndpoints(): EndpointConfig[] {
  return ENDPOINT_REGISTRY;
}
