import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ContentType as EndpointDomainContentType,
  HttpAuthScheme as EndpointDomainHttpAuthScheme,
  HttpHeader as EndpointDomainHttpHeader,
  HttpStatus as EndpointDomainHttpStatus,
} from '@ocentra/endpoint-domain/constants/http';
import {
  CreditAction as EndpointDomainCreditAction,
  Currency as EndpointDomainCurrency,
} from '@ocentra/endpoint-domain/constants/credits';
import { IdempotencyKeyPrefix as EndpointDomainIdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { ApiEndpoint as EndpointDomainApi } from '@ocentra/endpoint-domain/constants/cloudflare';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..', '..');

const testConstantsPath = join(rootDir, 'tests/constants/test-constants.ts');
const outputPath = join(rootDir, 'tests/k6/constants.js');

function flattenApiEndpointForK6(): Record<string, string> {
  const ep = EndpointDomainApi as Record<string, unknown>;
  const flat: Record<string, string> = {
    Root: ep.Root as string,
    Health: ep.Health as string,
    Explore: (ep.Explore as { Base: string }).Base,
    ExploreLeaderboard: (ep.Explore as { Leaderboard: string }).Leaderboard,
    ExploreBenchmark: (ep.Explore as { Benchmark: string }).Benchmark,
    ApiExploreMatches: (ep.ExploreApi as { Matches: string }).Matches,
    ApiExploreBenchmarks: (ep.ExploreApi as { Benchmarks: string }).Benchmarks,
    ApiMatches: (ep.Matches as { Base: string }).Base,
    ApiDisputes: (ep.Disputes as { Base: string }).Base,
    ApiCredits: (ep.Credits as Record<string, (id: string) => string>).Balance('_').replace(/\/_\/(?:balance|purchase|transactions|award|consume)$/, ''),
    ApiBadges: (ep.Badges as { Base: string }).Base,
    ApiLogs: (ep.Logs as { Base: string }).Base,
    ApiResources: (ep.Resources as { Base: string }).Base,
    ApiAssets: (ep.Assets as { Base: string }).Base,
    ApiTest: (ep.Test as { Base: string }).Base,
    ApiTestClearAll: (ep.Test as { ClearAll: string }).ClearAll,
    ApiAi: (ep.AI as { Base: string }).Base,
    ApiAiOnEvent: (ep.AI as { OnEvent: string }).OnEvent,
    ApiLeaderboard: (ep.Leaderboard as { Base: string }).Base,
    ApiPlayers: (ep.Players as { Base: string }).Base,
    ApiDocs: (ep.Docs as { Base: string }).Base,
    Docs: (ep.Docs as { Base: string }).Base,
    Swagger: (ep.Docs as { Swagger: string }).Swagger,
    SwaggerJson: (ep.Docs as { SwaggerJson: string }).SwaggerJson,
    OpenApiJson: ep.OpenApiJson as string,
    ApiOpenApiJson: ep.OpenApiJson as string,
    ApiMetrics: ep.Metrics as string,
    ApiAlerts: ep.Alerts as string,
    ApiImageProxy: ep.ImageProxy as string,
  };
  flat.ApiMatchesAnonymize = '/anonymize';
  flat.ApiDisputesEvidence = '/evidence';
  return flat;
}

function extractTestConfig(): Record<string, string> {
  const content = readFileSync(testConstantsPath, 'utf-8');
  const config: Record<string, string> = {};
  
  const localhostOrigin2Match = content.match(/LocalhostOrigin2:\s*['"`]([^'"`]+)['"`]/);
  if (localhostOrigin2Match) config.LocalhostOrigin2 = localhostOrigin2Match[1];
  
  return config;
}

function extractTestDefaults(): Record<string, string | number> {
  return {
    LoadTestUserIdPrefix: 'load-test-',
    TestTokenPrefix: 'test-token:',
    DefaultWorkerUrl: 'http://localhost:8787',
    TestAcAmount: 10,
    TestAmount: 0.1,
    TestSleepSeconds: 0.1,
  };
}

const ApiEndpoint = flattenApiEndpointForK6();
const HttpHeader = EndpointDomainHttpHeader;
const HttpStatus = EndpointDomainHttpStatus;
const Currency = EndpointDomainCurrency;
const HttpContentType = EndpointDomainContentType;
const HttpAuthScheme = EndpointDomainHttpAuthScheme;
const CreditAction = EndpointDomainCreditAction;
const IdempotencyKeyPrefix = EndpointDomainIdempotencyKeyPrefix;
const TestConfig = extractTestConfig();
const TestDefaults = extractTestDefaults();

const output = `// AUTO-GENERATED from @ocentra/endpoint-domain and src/constants/*.ts
// DO NOT EDIT MANUALLY - run: npm run generate:k6-constants

export const ApiEndpoint = ${JSON.stringify(ApiEndpoint, null, 2)};

export const HttpHeader = ${JSON.stringify(HttpHeader, null, 2)};

export const HttpStatus = ${JSON.stringify(HttpStatus, null, 2)};

export const Currency = ${JSON.stringify(Currency, null, 2)};

export const HttpContentType = ${JSON.stringify(HttpContentType, null, 2)};

export const HttpAuthScheme = ${JSON.stringify(HttpAuthScheme, null, 2)};

export const CreditAction = ${JSON.stringify(CreditAction, null, 2)};

export const IdempotencyKeyPrefix = ${JSON.stringify(IdempotencyKeyPrefix, null, 2)};

export const TestConfig = ${JSON.stringify(TestConfig, null, 2)};

export const TestDefaults = ${JSON.stringify(TestDefaults, null, 2)};
`;

writeFileSync(outputPath, output, 'utf-8');
process.stdout.write('Generated k6 constants from TypeScript source\n');
