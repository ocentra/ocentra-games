import { OpenApiServer, OpenApiSecurityScheme } from '@/constants/openapi';
import { MonitoringWebhookDomain } from '@/constants/monitoring';
import { NodeCryptoKeyFormat, NodeCryptoKeyType, NodeCryptoSignAlgorithm } from '@/constants/crypto';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';

export const TestEnvVar = {
  TestMode: 'TEST_MODE',
  TestRunMode: 'TEST_RUN_MODE',
  TestRunId: 'TEST_RUN_ID',
  TestRunType: 'TEST_RUN_TYPE',
  TestFiles: 'TEST_FILES',
  TestSuiteType: 'TEST_SUITE_TYPE',
  TestRunner: 'TEST_RUNNER',
  TestLogServerPort: 'TEST_LOG_SERVER_PORT',
  WorkerUrl: 'WORKER_URL',
  ViteWorkerUrl: 'VITE_LOGS_WORKER_URL',
  RealWorkerMaxRequestsPerTest: 'REAL_WORKER_MAX_REQUESTS_PER_TEST',
  RealWorkerMaxRequestsPerRun: 'REAL_WORKER_MAX_REQUESTS_PER_RUN',
  LogWorkerFetch: 'LOG_WORKER_FETCH',
  FirebaseProjectId: 'FIREBASE_PROJECT_ID',
  ViteFirebaseProjectId: 'VITE_FIREBASE_PROJECT_ID',
  LogsApiKey: 'LOGS_API_KEY',
  ViteLogsApiKey: 'VITE_LOGS_API_KEY',
} as const;

export type TestEnvVar = typeof TestEnvVar[keyof typeof TestEnvVar];

function getFirebaseProjectId(): string {
  const envValue = process.env[TestEnvVar.FirebaseProjectId] || process.env[TestEnvVar.ViteFirebaseProjectId];
  return (envValue && envValue.trim()) ? envValue.trim() : 'claim-b020c';
}

function getWorkerUrlDev(): string {
  return process.env[TestEnvVar.WorkerUrl] || process.env[TestEnvVar.ViteWorkerUrl] || OpenApiServer.Development;
}

function getWorkerUrlProd(): string {
  return OpenApiServer.Production;
}

export const TestConfig = {
  ProductionCorsOrigin: 'https://game.ocentra.ca',
  TestCorsOrigin: 'https://game.ocentra.ca',
  get FirebaseProjectId() { return getFirebaseProjectId(); },
  get WorkerUrlDev() { return getWorkerUrlDev(); },
  get WorkerUrlProd() { return getWorkerUrlProd(); },
  TestApiUrlPlaceholder: 'https://api.test',
  TestUserId: 'test-user',
  TestAdminUserId: 'test-admin-user',
  TestWalletId: 'test-wallet',
  TestMatchId: asMatchId('550e8400-e29b-41d4-a716-446655440000'),
  TestDisputeId: 'test-dispute',
  TestHash: 'a'.repeat(64),
  TestHash2: 'b'.repeat(64),
  TestHashNonexistent: 'c'.repeat(64),
  LocalhostOrigin: 'http://localhost:5173',
  LocalhostOrigin2: 'http://localhost:3000',
  LocalhostOrigin3: 'http://localhost:9999',
  EvilOrigin: 'https://evil.com',
  EvilSubdomainOrigin: 'https://evil.game.ocentra.ca',
  EvilSimilarDomainOrigin: 'https://game.ocentra.ca.evil.com',
  InvalidToken: 'invalid-token',
  InvalidTokenFormat: 'invalid-format',
  TestToken: 'test-token',
  RegularUserId: 'regular-user',
  OtherUserId: 'other-user',
  AttackerUserId: 'attacker-user-id',
  AttackerEmail: 'attacker@evil.com',
  AttackerKeyId: 'attacker-key-id',
  TestPlayerId: 'test-player',
  TestPlayerIdStorage: 'test-player-storage',
  TestUserDo: 'test-user-do',
  TestUserPersist: 'test-user-persist',
  TestUserUpdate: 'test-user-update',
  TestSecretKey: 'test-secret-key-for-development-only-change-in-production',
  TestLogsApiKey: 'test-logs-api-key',
  get TestWebhookUrl() { return `https://${MonitoringWebhookDomain.Slack}/test`; },
  InvalidEventType: 'invalid_event_type',
  TestHash3: 'd'.repeat(64),
  TestHash4: 'e'.repeat(64),
  TestHash5: 'f'.repeat(64),
  TestMatchVersion: '1.0.0',
  TestMoveData: 'test',
  TestCheckpointData: 'test',
  TestOriginExample: 'https://test.example.com',
  TestOriginExampleHttp: 'http://example.com',
  AttackOriginNull: 'null',
  AttackOriginFile: 'file:///etc/passwd',
  AttackOriginDataUri: 'data:text/html,<script>alert(1)</script>',
  AttackOriginIpv4Localhost: 'http://127.0.0.1',
  AttackOriginIpv4Private: 'https://192.168.1.1',
  AttackOriginIpv6Localhost: 'http://[::1]',
  AttackOriginIpv6Example: 'https://[2001:db8::1]',
  TestPortMismatch: ':8080',
  TestTldSuffix: '.ca',
  PathTraversalUserId: '../../etc/passwd',
  TestDebugModulesBadges: 'Badges',
  InvalidBadgeId: 'invalid-badge-id',
  BadgeMaxActiveErrorSubstring: 'Maximum',
  BadgeIdTestPrefix: 'badge-',
  VictimUserId: 'victim-user',
  AttackerUserIdCredits: 'attacker-user',
  get JwtType() { return OpenApiSecurityScheme.BearerFormatJwt; },
  get KeyFormatPem() { return NodeCryptoKeyFormat.Pem; },
  get KeyTypeSpki() { return NodeCryptoKeyType.Spki; },
  get KeyTypePkcs8() { return NodeCryptoKeyType.Pkcs8; },
  get CryptoSignAlgorithmRsaSha256() { return NodeCryptoSignAlgorithm.RsaSha256; },
} as const;

export type TestConfig = typeof TestConfig[keyof typeof TestConfig];

export const TestEnvValue = {
  Local: 'local',
  Real: 'real',
  Cloud: 'cloud',
  Development: 'development',
  Test: 'test',
  True: 'true',
} as const;

export type TestEnvValue = typeof TestEnvValue[keyof typeof TestEnvValue];

export const WorkerMode = {
  InProcess: 'in-process',
  Http: 'http',
  Both: 'both',
  Real: 'real',
} as const;

export type WorkerMode = typeof WorkerMode[keyof typeof WorkerMode];

export const WorkerHealth = {
  Ready: 'ready',
  Starting: 'starting',
  Error: 'error',
  Stopped: 'stopped',
} as const;

export type WorkerHealth = typeof WorkerHealth[keyof typeof WorkerHealth];

export const TestTimeout = {
  Default: 30000,
  Short: 1000,
  Medium: 500,
  VeryShort: 200,
  WebSocketMessage: 5000,
  WebSocketMessageLong: 6000,
} as const;

export type TestTimeout = typeof TestTimeout[keyof typeof TestTimeout];

export const TestWorkerPort = {
  Default: 8787,
} as const;

export type TestWorkerPort = typeof TestWorkerPort[keyof typeof TestWorkerPort];

export { TestWorkerBindings } from './test-worker-bindings';

export const TestWorkerMessage = {
  CreatedSuccessfully: 'Worker created successfully',
  HealthCheckFailed: 'health check failed',
} as const;

export type TestWorkerMessage = typeof TestWorkerMessage[keyof typeof TestWorkerMessage];

export const TestLogServer = {
  Port: 3002,
  Path: '/__logs__',
  PathWithQuery: '__logs__?',
  Host: '127.0.0.1',
  BaseUrl: 'https://ocentra-log-bridge.ocentra.ca',
  BaseUrl127: (port: number = 8765) => `http://127.0.0.1:${port}`,
} as const;

export const TestWorkerHost = {
  ApiTest: 'api.test',
  Localhost: 'localhost',
  Localhost127: '127.0.0.1',
} as const;

export const TestWorkerUrl = {
  Localhost: (port: number = TestWorkerPort.Default) => `http://localhost:${port}`,
  TestWorker: 'https://test-worker.workers.dev',
  TestWorkerWithSlash: 'https://test-worker.workers.dev/',
  ApiExample: 'https://api.example.com',
  Unreachable: 'https://unreachable-worker-12345.workers.dev',
  SomeWorker: 'https://some-worker.workers.dev',
} as const;

export const TestValues = {
  InvalidAction: 'invalid-action',
  InvalidBadgeIdsValue: 'not-an-array',
  ManifestGuid: '58bf2b05-15ce-4870-9199-d295803a2d8c',
  TestAssetGuid: 'aaaaaaaa-bbbb-4ccc-9eee-eeeeeeeeeeee',
  WebSocketCloseReasonDone: 'test done',
  MatchWSUnsupportedType: 'unsupported',
} as const;

export type TestValue = (typeof TestValues)[keyof typeof TestValues];

export const TestR2LockWait = {
  MaxRetries: 3,
  InitialDelayMs: 100,
} as const;

export const TestR2LockWaitLong = {
  MaxRetries: 5,
  InitialDelayMs: 200,
} as const;

export const TestR2LockWaitShort = {
  MaxRetries: 2,
  InitialDelayMs: 50,
} as const;

export type TestR2LockWait = typeof TestR2LockWait[keyof typeof TestR2LockWait];
