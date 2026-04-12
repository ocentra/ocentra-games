#!/usr/bin/env node

import { execFileSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TestTokenPrefix } from '@ocentra/endpoint-domain/constants/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { TournamentDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpAuthScheme, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { FormField } from '@ocentra/endpoint-domain/constants/form-fields';
import { OpenApiParameterName } from '@ocentra/endpoint-domain/constants/openapi';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { TournamentResultField } from '@ocentra/endpoint-domain/constants/worker-contract-values';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { generateOpenApiJson, openApiExplicitExampleRoutes } from '@/utils/openapi';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');
const testRunnerReportsDir = path.join(testRunnerDir, 'reports');
const schemathesisResultsJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');
const schemathesisExamplesResultsJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-examples-results.json');
const schemathesisWorkspaceLogPath = path.join(testRunnerLogsDir, 'schemathesis.log');
const schemathesisExamplesWorkspaceLogPath = path.join(testRunnerLogsDir, 'schemathesis-examples.log');
const schemathesisWorkspaceNdjsonPath = path.join(testRunnerReportsDir, 'schemathesis.ndjson');
const schemathesisWorkspaceJunitPath = path.join(testRunnerReportsDir, 'schemathesis.junit.xml');
const schemathesisExamplesWorkspaceNdjsonPath = path.join(testRunnerReportsDir, 'schemathesis.examples.ndjson');
const schemathesisExamplesWorkspaceJunitPath = path.join(testRunnerReportsDir, 'schemathesis.examples.junit.xml');
const schemathesisExamplesStoryNdjsonPath = path.join(testRunnerReportsDir, 'schemathesis.examples.story.ndjson');
const schemathesisExamplesSummaryTxtPath = path.join(testRunnerReportsDir, 'schemathesis.examples.txt');
const workerPort = 8787;
const workerBaseUrl = `http://localhost:${workerPort}`;
const workerHealthUrl = `${workerBaseUrl}${ApiEndpoint.Health}`;

ensureDir(testRunnerReportJsonDir);
ensureDir(testRunnerLogsDir);
ensureDir(testRunnerReportsDir);

type OpenApiSchema = {
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  additionalProperties?: boolean | OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  type?: string;
  format?: string;
  required?: string[];
  minimum?: number;
  minLength?: number;
  pattern?: string;
};

type OpenApiMediaType = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
};

type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
  requestBody?: {
    content?: Record<string, OpenApiMediaType>;
  };
  responses?: Record<string, {
    content?: Record<string, OpenApiMediaType>;
  }>;
};

type ExampleGapRow = {
  operation: string;
  gaps: string[];
};

type PortOwner = {
  pid: number;
  name?: string;
  command?: string;
};

type WorkerStartHandle = {
  child: ReturnType<typeof spawn>;
  getOutput: () => string;
  getStatus: () => {
    exited: boolean;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    error?: string;
  };
};

type WorkerEnsureResult = {
  ok: boolean;
  started: boolean;
  reason?: string;
  details?: string;
  cleanup?: () => void;
};

type SchemathesisRunResult = {
  code: number;
  output: string;
  liveOutput: boolean;
};

type JunitSummary = {
  testCases?: number;
  failures?: number;
  errors?: number;
  skipped?: number;
  duration?: number;
};

type SchemathesisCaseStatus = 'passed' | 'failed' | 'error' | 'skipped';

type SchemathesisCase = {
  name: string;
  status: SchemathesisCaseStatus;
  time?: number;
  reason?: string;
  details?: string;
};

type SchemathesisCaseSummary = {
  cases: SchemathesisCase[];
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
};

type SchemathesisPhaseRun = {
  name: string;
  code: number;
  output: string;
  liveOutput: boolean;
  duration: number;
  runtimeDir: string;
  reportDir: string;
  ndjsonReportPath?: string;
  junitReportPath?: string;
  ndjsonWorkspacePath?: string;
  junitWorkspacePath?: string;
  junitSummary: JunitSummary;
  caseSummary: SchemathesisCaseSummary;
  schemaPath: string;
};

type SchemathesisRuntimeFixtures = {
  aiProviderId: string;
  aiMockBaseUrl: string;
  userId: string;
  roomId: string;
  matchToken: string;
  registerTournamentId: string;
  startTournamentId: string;
  prizeTournamentId: string;
  tournamentResultMatchId: string;
  tournamentResultWinnerId: string;
  assetHash: string;
  promoCode: string;
  leaderboardMatchIds: string[];
  leaderboardGameType: number;
  leaderboardUserId: string;
  archiveMatchId: string;
  moderationReportId: string;
  escrowId: string;
  listingId: string;
  friendId: string;
};

function getTestUserIdFromToken(token: string): string | null {
  const match = token.match(/^test-token:([^:]+)(?::admin)?$/);
  return match?.[1] ?? null;
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function pythonStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function resetFile(filePath: string): void {
  fs.writeFileSync(filePath, '', 'utf-8');
}

function appendNdjsonEntry(filePath: string, entry: unknown): void {
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

function writeSchemathesisHooksFile(runtimeDir: string, fixtures: SchemathesisRuntimeFixtures): string {
  const hooksPath = path.join(runtimeDir, 'schemathesis_hooks.py');
  const assetHash = fixtures.assetHash.trim();
  const explicitRoutes = openApiExplicitExampleRoutes
    .map((route) => `    (${pythonStringLiteral(route.method.toUpperCase())}, ${pythonStringLiteral(route.path)}),`)
    .join('\n');
  const assetsCase = assetHash.length > 0
    ? [
        `    if (method, path) == ("GET", ${pythonStringLiteral(ApiEndpoint.Assets.Base)}):`,
        `        examples.append(Case(operation, method, path, query={"hash": ${pythonStringLiteral(assetHash)}}))`,
        '        return',
        '',
      ].join('\n')
    : '';
  const playerCase = [
    `    if (method, path) == ("GET", ${pythonStringLiteral(ApiEndpoint.Players.ById('{userId}'))}):`,
    '        examples.append(Case(operation, method, path, path_parameters={"userId": "schemathesis"}))',
    '        return',
    '',
  ].join('\n');
  const disputeEvidenceCase = [
    `    if (method, path) == ("POST", ${pythonStringLiteral(ApiEndpoint.Disputes.Evidence(`{${OpenApiParameterName.DisputeId}}`))}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"disputeId": ${pythonStringLiteral(OpenApiExampleValue.DisputeId)}}, body=${JSON.stringify(OpenApiExampleValue.DisputeEvidenceRequest)}, media_type=${pythonStringLiteral(HttpContentType.MultipartFormData)}, multipart_content_types={${pythonStringLiteral(FormField.Evidence)}: ${pythonStringLiteral(HttpContentType.TextPlain)}}))`,
    '        return',
    '',
  ].join('\n');
  const disputeEvidenceCaseStrategy = [
    `@schemathesis.hook("before_generate_case").apply_to(method="POST", path=${pythonStringLiteral(ApiEndpoint.Disputes.Evidence(`{${OpenApiParameterName.DisputeId}}`))})`,
    'def generate_dispute_evidence_case(ctx, strategy):',
    '    operation = ctx.operation',
    `    return st.just(Case(operation, "POST", ${pythonStringLiteral(ApiEndpoint.Disputes.Evidence(`{${OpenApiParameterName.DisputeId}}`))}, path_parameters={"disputeId": ${pythonStringLiteral(OpenApiExampleValue.DisputeId)}}, body=${JSON.stringify(OpenApiExampleValue.DisputeEvidenceRequest)}, media_type=${pythonStringLiteral(HttpContentType.MultipartFormData)}, multipart_content_types={${pythonStringLiteral(FormField.Evidence)}: ${pythonStringLiteral(HttpContentType.TextPlain)}}))`,
    '',
  ].join('\n');
  const tournamentBasePath = ApiEndpoint.Tournament.ById(`{${OpenApiParameterName.TournamentId}}`);
  const tournamentBracketPath = `${tournamentBasePath}/${TournamentDOSegment.Bracket}`;
  const tournamentStartPath = `${tournamentBasePath}/${TournamentDOSegment.Start}`;
  const archiveMatchPath = ApiEndpoint.Archive.ByMatchId(`{${OpenApiParameterName.MatchId}}`);
  const anonymizeMatchPath = ApiEndpoint.Matches.Anonymize(`{${OpenApiParameterName.MatchId}}`);
  const roomSpectatePath = ApiEndpoint.Rooms.Spectate(`{${OpenApiParameterName.RoomId}}`);
  const tournamentBracketExample = [
    `    if (method, path) == ("GET", ${pythonStringLiteral(tournamentBracketPath)}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"tournamentId": ${pythonStringLiteral(fixtures.startTournamentId)}}))`,
    '        return',
    '',
  ].join('\n');
  const tournamentStartExample = [
    `    if (method, path) == ("POST", ${pythonStringLiteral(tournamentStartPath)}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"tournamentId": ${pythonStringLiteral(fixtures.startTournamentId)}}, body={}))`,
    '        return',
    '',
  ].join('\n');
  const archiveExample = [
    `    if (method, path) == ("POST", ${pythonStringLiteral(archiveMatchPath)}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"matchId": ${pythonStringLiteral(fixtures.archiveMatchId)}}))`,
    '        return',
    '',
  ].join('\n');
  const anonymizeExample = [
    `    if (method, path) == ("POST", ${pythonStringLiteral(anonymizeMatchPath)}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"matchId": ${pythonStringLiteral(fixtures.archiveMatchId)}}))`,
    '        return',
    '',
  ].join('\n');
  const roomSpectateExample = [
    `    if (method, path) == ("POST", ${pythonStringLiteral(roomSpectatePath)}):`,
    '        examples.clear()',
    `        examples.append(Case(operation, method, path, path_parameters={"roomId": ${pythonStringLiteral(fixtures.roomId)}}, body=${JSON.stringify(OpenApiExampleValue.LobbySpectateRequest)}))`,
    '        return',
    '',
  ].join('\n');
  const matchmakingExample = [
    `    if (method, path) == ("GET", ${pythonStringLiteral(ApiEndpoint.Matchmaking.Base)}):`,
    '        examples.clear()',
    '        examples.append(Case(operation, method, path))',
    '        return',
    '',
  ].join('\n');
  const createPinnedCaseStrategy = (
    functionName: string,
    method: string,
    routePath: string,
    options: {
      pathParameters?: Record<string, string | number>;
      body?: unknown;
    } = {}
  ): string => {
    const pathParameters = options.pathParameters ? `, path_parameters=${JSON.stringify(options.pathParameters)}` : '';
    const body = options.body !== undefined ? `, body=${JSON.stringify(options.body)}` : '';
    return [
      `@schemathesis.hook("before_generate_case").apply_to(method=${pythonStringLiteral(method)}, path=${pythonStringLiteral(routePath)})`,
      `def ${functionName}(ctx, strategy):`,
      '    operation = ctx.operation',
      `    return st.just(Case(operation, ${pythonStringLiteral(method)}, ${pythonStringLiteral(routePath)}${pathParameters}${body}))`,
      '',
    ].join('\n');
  };
  const tournamentBracketCaseStrategy = createPinnedCaseStrategy('generate_tournament_bracket_case', 'GET', tournamentBracketPath, {
    pathParameters: {
      tournamentId: fixtures.startTournamentId,
    },
  });
  const tournamentStartCaseStrategy = createPinnedCaseStrategy('generate_tournament_start_case', 'POST', tournamentStartPath, {
    pathParameters: {
      tournamentId: fixtures.startTournamentId,
    },
    body: {},
  });
  const archiveCaseStrategy = createPinnedCaseStrategy('generate_archive_case', 'POST', archiveMatchPath, {
    pathParameters: {
      matchId: fixtures.archiveMatchId,
    },
  });
  const anonymizeCaseStrategy = createPinnedCaseStrategy('generate_anonymize_case', 'POST', anonymizeMatchPath, {
    pathParameters: {
      matchId: fixtures.archiveMatchId,
    },
  });
  const roomSpectateCaseStrategy = createPinnedCaseStrategy('generate_room_spectate_case', 'POST', roomSpectatePath, {
    pathParameters: {
      roomId: fixtures.roomId,
    },
    body: OpenApiExampleValue.LobbySpectateRequest,
  });
  const matchmakingCaseStrategy = createPinnedCaseStrategy('generate_matchmaking_case', 'GET', ApiEndpoint.Matchmaking.Base);
  const content = [
    'import warnings',
    '',
    'import schemathesis',
    'from schemathesis import Case',
    'from hypothesis import strategies as st',
    'from hypothesis.errors import NonInteractiveExampleWarning',
    '',
    'warnings.filterwarnings("ignore", category=NonInteractiveExampleWarning)',
    '',
    '@schemathesis.deserializer("image/png")',
    'def deserialize_image(ctx, response):',
    '    return response.content.decode("latin1")',
    '',
    'EXPLICIT_EXAMPLE_ROUTES = {',
    explicitRoutes,
    '}',
    '',
    '@schemathesis.hook("before_add_examples")',
    'def add_explicit_examples(context, examples):',
    '    operation = context.operation',
    '    method = str(getattr(operation, "method", "")).upper()',
    '    path = str(getattr(operation, "path", ""))',
    assetsCase,
    playerCase,
    disputeEvidenceCase,
    tournamentBracketExample,
    tournamentStartExample,
    archiveExample,
    anonymizeExample,
    roomSpectateExample,
    matchmakingExample,
    '    if (method, path) not in EXPLICIT_EXAMPLE_ROUTES:',
    '        return',
    '    examples.append(operation.as_strategy().example())',
    '',
    tournamentBracketCaseStrategy,
    tournamentStartCaseStrategy,
    archiveCaseStrategy,
    anonymizeCaseStrategy,
    roomSpectateCaseStrategy,
    matchmakingCaseStrategy,
    disputeEvidenceCaseStrategy,
  ].join('\n');
  fs.writeFileSync(hooksPath, content, 'utf-8');
  return hooksPath;
}

function parseArgs(argv: string[]): { reportExamples: boolean; examplesOnly: boolean; includePath?: string } {
  let reportExamples = false;
  let examplesOnly = false;
  let includePath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report-examples' || arg === '--examples' || arg === 'examples' || arg === 'Example') {
      reportExamples = true;
      continue;
    }
    if (arg === '--examples-only') {
      examplesOnly = true;
      continue;
    }
    if (arg === '--include-path') {
      includePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--include-path=')) {
      includePath = arg.slice('--include-path='.length);
    }
  }

  return { reportExamples, examplesOnly, includePath };
}

function hasSchemaExample(schema: OpenApiSchema | undefined): boolean {
  if (!schema) {
    return false;
  }
  if (schema.example !== undefined || schema.default !== undefined) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return true;
  }
  return false;
}

function hasMediaTypeExample(mediaType: OpenApiMediaType | undefined): boolean {
  if (!mediaType) {
    return false;
  }
  if (mediaType.example !== undefined || mediaType.examples !== undefined) {
    return true;
  }
  return hasSchemaExample(mediaType.schema);
}

function hasParameterExample(parameter: OpenApiParameter): boolean {
  return parameter.example !== undefined || hasSchemaExample(parameter.schema);
}

function getOperationExamples(operation: OpenApiOperation): string[] {
  const missing: string[] = [];

  const requestContent = operation.requestBody?.content ?? {};
  const requestExamples = Object.values(requestContent).some(hasMediaTypeExample);
  if (Object.keys(requestContent).length > 0 && !requestExamples) {
    missing.push('requestBody.example');
  }

  const parameterIssues = (operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'path' || (parameter.in === 'query' && parameter.required === true))
    .filter((parameter) => !hasParameterExample(parameter))
    .map((parameter) => `${parameter.in ?? 'unknown'}:${parameter.name ?? 'unknown'}`);
  if (parameterIssues.length > 0) {
    missing.push(`parameters.example(${parameterIssues.join(', ')})`);
  }

  const successResponses = Object.entries(operation.responses ?? {}).filter(([status]) => /^2\d\d$/.test(status));
  const successWithContent = successResponses.filter(([, response]) => Object.keys(response.content ?? {}).length > 0);
  const successHasExample = successWithContent.some(([, response]) => Object.values(response.content ?? {}).some(hasMediaTypeExample));
  if (successWithContent.length > 0 && !successHasExample) {
    missing.push('2xx response.example');
  }

  return missing;
}

function collectExampleGapRows(includePath?: string): ExampleGapRow[] {
  const openApi = JSON.parse(generateOpenApiJson()) as { paths?: Record<string, Record<string, OpenApiOperation>> };
  const regex = includePath ? new RegExp(includePath) : undefined;
  const rows: Array<{ operation: string; gaps: string[] }> = [];

  for (const [pathKey, pathItem] of Object.entries(openApi.paths ?? {})) {
    if (regex && !regex.test(pathKey)) {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) {
        continue;
      }
      const gaps = getOperationExamples(operation);
      if (gaps.length > 0) {
        rows.push({ operation: `${method.toUpperCase()} ${pathKey}`, gaps });
      }
    }
  }

  rows.sort((left, right) => left.operation.localeCompare(right.operation));

  return rows;
}

function reportExampleGaps(includePath?: string): number {
  const rows = collectExampleGapRows(includePath);

  console.log('[run-schemathesis] OpenAPI example gap report');
  console.log(`  Included path filter: ${includePath ?? '(none)'}`);
  console.log(`  Operations with missing examples: ${rows.length}`);
  for (const row of rows) {
    console.log(`  - ${row.operation}`);
    for (const gap of row.gaps) {
      console.log(`    - ${gap}`);
    }
  }

  return rows.length;
}

function getSchemathesisEnv(runtimeDir?: string): NodeJS.ProcessEnv {
  const pythonPath = runtimeDir
    ? [runtimeDir, process.env.PYTHONPATH].filter((value): value is string => typeof value === 'string' && value.length > 0).join(path.delimiter)
    : process.env.PYTHONPATH;
  return {
    ...process.env,
    ...(runtimeDir
      ? {
          PYTHONPATH: pythonPath,
          SCHEMATHESIS_HOOKS: 'schemathesis_hooks',
          TEST_MODE: QueryValue.True,
        }
      : {}),
    PYTHONIOENCODING: 'utf-8',
    PYTHONLEGACYWINDOWSSTDIO: '0',
    PYTHONUTF8: '1',
  };
}

function getDefaultSchemathesisWorkers(): string {
  const cpuCount = os.cpus().length;
  if (!Number.isFinite(cpuCount) || cpuCount <= 1) {
    return '1';
  }
  return String(cpuCount);
}

function createRuntimeArtifactsDir(): string {
  const runtimeDir = path.join(os.tmpdir(), 'ocentra-schemathesis', `${Date.now()}-${process.pid}`);
  ensureDir(runtimeDir);
  return runtimeDir;
}

function createSchemathesisRuntimeFixtures(baseUrl: string): SchemathesisRuntimeFixtures {
  const runId = `${Date.now()}-${process.pid}`;
  return {
    aiProviderId: OpenApiExampleValue.AiProviderId,
    aiMockBaseUrl: `${baseUrl}${ApiEndpoint.Test.Base}/mock-ai/v1`,
    userId: '',
    roomId: OpenApiExampleValue.UuidOne,
    matchToken: '',
    registerTournamentId: `schemathesis-register-${runId}`,
    startTournamentId: `schemathesis-start-${runId}`,
    prizeTournamentId: `schemathesis-prize-${runId}`,
    tournamentResultMatchId: OpenApiExampleValue.MatchId,
    tournamentResultWinnerId: OpenApiExampleValue.UserId,
    assetHash: OpenApiExampleValue.AssetHash,
    promoCode: OpenApiExampleValue.PromoCode,
    leaderboardMatchIds: [],
    leaderboardGameType: 0,
    leaderboardUserId: OpenApiExampleValue.UserId,
    archiveMatchId: OpenApiExampleValue.MatchId,
    moderationReportId: OpenApiExampleValue.ReportId,
    escrowId: OpenApiExampleValue.UuidZero,
    listingId: OpenApiExampleValue.ListingId,
    friendId: OpenApiExampleValue.FriendId,
  };
}

function readJsonFixture<T>(...segments: string[]): T {
  const fixturePath = path.join(cloudflareDir, ...segments);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as T;
}

function applyRuntimeOpenApiFixtures(openApiJson: string, fixtures: SchemathesisRuntimeFixtures): string {
  const spec = JSON.parse(openApiJson) as {
    paths?: Record<string, Record<string, OpenApiOperation>>;
  };

  const setPathParameterExample = (
    pathKey: string,
    method: string,
    parameterName: string,
    example: string | number
  ): void => {
    const operation = spec.paths?.[pathKey]?.[method];
    const parameter = operation?.parameters?.find((item) => item.name === parameterName);
    if (!parameter) {
      return;
    }
    if (parameter.schema) {
      parameter.schema.example = example;
    }
    parameter.example = example;
  };

  const setQueryParameterExample = (
    pathKey: string,
    method: string,
    parameterName: string,
    example: string | number
  ): void => {
    const operation = spec.paths?.[pathKey]?.[method];
    const parameter = operation?.parameters?.find((item) => item.name === parameterName);
    if (!parameter) {
      return;
    }
    if (parameter.schema) {
      parameter.schema.example = example;
    }
    parameter.example = example;
  };

  const setRequestBodyExample = (pathKey: string, method: string, updater: (body: { content?: Record<string, { schema?: Record<string, unknown>; example?: unknown }> }) => void): void => {
    const operation = spec.paths?.[pathKey]?.[method];
    if (!operation?.requestBody) {
      return;
    }
    updater(operation.requestBody);
  };

  const tournamentBasePath = ApiEndpoint.Tournament.ById('{tournamentId}');
  setPathParameterExample(tournamentBasePath, 'get', 'tournamentId', fixtures.startTournamentId);
  setPathParameterExample(`${tournamentBasePath}/${TournamentDOSegment.Bracket}`, 'get', 'tournamentId', fixtures.startTournamentId);
  setPathParameterExample(`${tournamentBasePath}/register`, 'post', 'tournamentId', fixtures.registerTournamentId);
  setPathParameterExample(`${tournamentBasePath}/start`, 'post', 'tournamentId', fixtures.startTournamentId);
  setPathParameterExample(`${tournamentBasePath}/result`, 'post', 'tournamentId', fixtures.startTournamentId);
  setPathParameterExample(`${tournamentBasePath}/distribute-prizes`, 'post', 'tournamentId', fixtures.prizeTournamentId);
  setPathParameterExample(`${ApiEndpoint.Leaderboard.Base}/{${OpenApiParameterName.GameType}}`, 'get', 'gameType', fixtures.leaderboardGameType);
  setPathParameterExample(`${ApiEndpoint.Leaderboard.Base}/{${OpenApiParameterName.GameType}}/user/{${OpenApiParameterName.UserId}}`, 'get', 'gameType', fixtures.leaderboardGameType);
  setPathParameterExample(`${ApiEndpoint.Leaderboard.Base}/{${OpenApiParameterName.GameType}}/user/{${OpenApiParameterName.UserId}}`, 'get', 'userId', fixtures.leaderboardUserId);
  setPathParameterExample(`${ApiEndpoint.Leaderboard.Base}/{${OpenApiParameterName.GameType}}/nearby/{${OpenApiParameterName.UserId}}`, 'get', 'gameType', fixtures.leaderboardGameType);
  setPathParameterExample(`${ApiEndpoint.Leaderboard.Base}/{${OpenApiParameterName.GameType}}/nearby/{${OpenApiParameterName.UserId}}`, 'get', 'userId', fixtures.leaderboardUserId);
  setPathParameterExample(ApiEndpoint.Rooms.Spectate(`{${OpenApiParameterName.RoomId}}`), 'post', 'roomId', fixtures.roomId);
  setPathParameterExample(`${ApiEndpoint.Archive.Base}/{${OpenApiParameterName.MatchId}}`, 'post', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Matches.ById(`{${OpenApiParameterName.MatchId}}`), 'get', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Matches.ById(`{${OpenApiParameterName.MatchId}}`), 'post', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Matches.Anonymize(`{${OpenApiParameterName.MatchId}}`), 'post', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Replay.ByMatchId(`{${OpenApiParameterName.MatchId}}`), 'get', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Replay.Verify(`{${OpenApiParameterName.MatchId}}`), 'get', 'matchId', fixtures.archiveMatchId);
  setPathParameterExample(ApiEndpoint.Disputes.ById(`{${OpenApiParameterName.DisputeId}}`), 'get', 'disputeId', OpenApiExampleValue.DisputeId);
  setPathParameterExample(ApiEndpoint.Disputes.ById(`{${OpenApiParameterName.DisputeId}}`), 'put', 'disputeId', OpenApiExampleValue.DisputeId);
  setPathParameterExample(ApiEndpoint.Disputes.Evidence(`{${OpenApiParameterName.DisputeId}}`), 'post', 'disputeId', OpenApiExampleValue.DisputeId);
  setPathParameterExample(ApiEndpoint.Admin.ModerationResolve(`{${OpenApiParameterName.ReportId}}`), 'post', 'reportId', fixtures.moderationReportId);
  setPathParameterExample(ApiEndpoint.Friends.ById(`{${OpenApiParameterName.FriendId}}`), 'post', 'friendId', fixtures.friendId);
  setPathParameterExample(ApiEndpoint.Credits.Balance(`{${OpenApiParameterName.UserId}}`), 'get', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.Transactions(`{${OpenApiParameterName.UserId}}`), 'get', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.Award(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.Purchase(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.Consume(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.ConsumeGP(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Credits.Earn(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);
  setPathParameterExample(ApiEndpoint.Badges.Claim(`{${OpenApiParameterName.UserId}}`), 'post', OpenApiParameterName.UserId, fixtures.userId);

  setPathParameterExample(ApiEndpoint.AI.KeysById('{providerId}'), 'delete', 'providerId', fixtures.aiProviderId);
  setPathParameterExample(ApiEndpoint.AI.KeysTest('{providerId}'), 'post', 'providerId', fixtures.aiProviderId);
  if (fixtures.matchToken) {
    setQueryParameterExample(ApiEndpoint.Matches.ById(`{${OpenApiParameterName.MatchId}}`), 'get', OpenApiParameterName.Token, fixtures.matchToken);
  }
  setRequestBodyExample(ApiEndpoint.Rooms.Spectate(`{${OpenApiParameterName.RoomId}}`), 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.LobbySpectateRequest;
    }
    if (schema?.properties?.userId) {
      schema.properties.userId.example = fixtures.userId;
    }
    if (schema?.properties?.displayName) {
      schema.properties.displayName.example = 'Guest Spectator';
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      const example = schema.example as Record<string, unknown>;
      example.userId = fixtures.userId;
      example.displayName = 'Guest Spectator';
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      const example = json.example as Record<string, unknown>;
      example.userId = fixtures.userId;
      example.displayName = 'Guest Spectator';
    }
  });
  setRequestBodyExample(`${tournamentBasePath}/result`, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.TournamentResultRequest;
    }
    if (schema?.properties?.[OpenApiParameterName.MatchId]) {
      schema.properties[OpenApiParameterName.MatchId].example = fixtures.tournamentResultMatchId;
    }
    if (schema?.properties?.[TournamentResultField.WinnerId]) {
      schema.properties[TournamentResultField.WinnerId].example = fixtures.tournamentResultWinnerId;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      const example = schema.example as Record<string, unknown>;
      example[OpenApiParameterName.MatchId] = fixtures.tournamentResultMatchId;
      example[TournamentResultField.WinnerId] = fixtures.tournamentResultWinnerId;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      const example = json.example as Record<string, unknown>;
      example[OpenApiParameterName.MatchId] = fixtures.tournamentResultMatchId;
      example[TournamentResultField.WinnerId] = fixtures.tournamentResultWinnerId;
    }
  });
  setRequestBodyExample(ApiEndpoint.AI.Generate, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as { properties?: Record<string, { example?: unknown }> } | undefined;
    if (schema?.properties?.providerId) {
      schema.properties.providerId.example = fixtures.aiProviderId;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      (schema.example as Record<string, unknown>).providerId = fixtures.aiProviderId;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      (json.example as Record<string, unknown>).providerId = fixtures.aiProviderId;
    }
  });
  setRequestBodyExample(ApiEndpoint.AI.KeysCustom, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as { properties?: Record<string, { example?: unknown }> } | undefined;
    if (schema?.properties?.providerId) {
      schema.properties.providerId.example = fixtures.aiProviderId;
    }
    if (schema?.properties?.baseUrl) {
      schema.properties.baseUrl.example = fixtures.aiMockBaseUrl;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      const example = schema.example as Record<string, unknown>;
      example.providerId = fixtures.aiProviderId;
      example.baseUrl = fixtures.aiMockBaseUrl;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      const example = json.example as Record<string, unknown>;
      example.providerId = fixtures.aiProviderId;
      example.baseUrl = fixtures.aiMockBaseUrl;
    }
  });
  setRequestBodyExample(ApiEndpoint.AI.EscrowConsume, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.additionalProperties = false;
    }
    if (schema?.properties?.escrowId) {
      schema.properties.escrowId.example = fixtures.escrowId;
      schema.properties.escrowId.enum = [fixtures.escrowId];
    }
    if (schema?.properties?.actualInputTokens) {
      schema.properties.actualInputTokens.example = 48;
      schema.properties.actualInputTokens.minimum = 0;
    }
    if (schema?.properties?.actualOutputTokens) {
      schema.properties.actualOutputTokens.example = 12;
      schema.properties.actualOutputTokens.minimum = 0;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      const example = schema.example as Record<string, unknown>;
      example.escrowId = fixtures.escrowId;
      example.actualInputTokens = 48;
      example.actualOutputTokens = 12;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      const example = json.example as Record<string, unknown>;
      example.escrowId = fixtures.escrowId;
      example.actualInputTokens = 48;
      example.actualOutputTokens = 12;
    }
  });
  setQueryParameterExample(ApiEndpoint.Assets.Base, 'get', 'hash', fixtures.assetHash);
  setRequestBodyExample(ApiEndpoint.Rewards.DailyClaim, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.RewardDailyClaimRequest;
    }
    if (schema?.properties?.userId) {
      schema.properties.userId.example = fixtures.userId;
    }
    if (schema?.properties?.idempotencyKey) {
      schema.properties.idempotencyKey.example = OpenApiExampleValue.IdempotencyKeyEarn;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      const example = schema.example as Record<string, unknown>;
      example.userId = fixtures.userId;
      example.idempotencyKey = OpenApiExampleValue.IdempotencyKeyEarn;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      const example = json.example as Record<string, unknown>;
      example.userId = fixtures.userId;
      example.idempotencyKey = OpenApiExampleValue.IdempotencyKeyEarn;
    }
  });
  setRequestBodyExample(ApiEndpoint.Marketplace.Buy, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.MarketplaceBuyRequest;
    }
    if (schema?.properties?.listingId) {
      schema.properties.listingId.example = fixtures.listingId;
      schema.properties.listingId.enum = [fixtures.listingId];
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      (schema.example as Record<string, unknown>).listingId = fixtures.listingId;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      (json.example as Record<string, unknown>).listingId = fixtures.listingId;
    }
  });
  setRequestBodyExample(ApiEndpoint.Marketplace.Sell, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.MarketplaceSellRequest;
    }
    if (schema?.properties?.itemId) {
      schema.properties.itemId.example = OpenApiExampleValue.MarketplaceSellRequest.itemId;
    }
    if (schema?.properties?.itemType) {
      schema.properties.itemType.example = OpenApiExampleValue.MarketplaceSellRequest.itemType;
    }
    if (schema?.properties?.price) {
      schema.properties.price.example = OpenApiExampleValue.MarketplaceSellRequest.price;
    }
    if (schema?.properties?.currency) {
      schema.properties.currency.example = OpenApiExampleValue.MarketplaceSellRequest.currency;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      Object.assign(schema.example as Record<string, unknown>, OpenApiExampleValue.MarketplaceSellRequest);
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      Object.assign(json.example as Record<string, unknown>, OpenApiExampleValue.MarketplaceSellRequest);
    }
  });
  setRequestBodyExample(ApiEndpoint.Credits.Redeem, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.CreditsRedeemRequest;
    }
    if (schema?.properties?.code) {
      schema.properties.code.example = fixtures.promoCode;
    }
    if (schema && 'example' in schema && schema.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
      (schema.example as Record<string, unknown>).code = fixtures.promoCode;
    }
    if (json?.example && typeof json.example === 'object' && !Array.isArray(json.example)) {
      (json.example as Record<string, unknown>).code = fixtures.promoCode;
    }
  });
  setRequestBodyExample(ApiEndpoint.Progression.Base, 'post', (body) => {
    const json = body.content?.['application/json'];
    const schema = json?.schema as OpenApiSchema | undefined;
    if (schema) {
      schema.example = OpenApiExampleValue.ProgressionUpdate;
    }
    for (const branch of schema?.oneOf ?? []) {
      if (branch.properties?.amount) {
        branch.properties.amount.example = OpenApiExampleValue.ProgressionUpdate.amount;
      }
      if (branch.properties?.xpAwarded) {
        branch.properties.xpAwarded.example = OpenApiExampleValue.ProgressionUpdate.amount;
      }
      if (branch.properties?.reason) {
        branch.properties.reason.example = OpenApiExampleValue.ProgressionUpdate.reason;
      }
      if (branch.properties?.idempotencyKey) {
        branch.properties.idempotencyKey.example = OpenApiExampleValue.ProgressionUpdate.idempotencyKey;
      }
    }
    if (schema?.properties?.amount) {
      schema.properties.amount.example = OpenApiExampleValue.ProgressionUpdate.amount;
    }
    if (json) {
      json.example = OpenApiExampleValue.ProgressionUpdate;
    }
  });

  return JSON.stringify(spec, null, 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url: string, authToken: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${authToken}`,
      [HttpHeader.ContentType]: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function seedExampleState(baseUrl: string, authToken: string, fixtures: SchemathesisRuntimeFixtures): Promise<void> {
  const userId = getTestUserIdFromToken(authToken);
  if (!userId) {
    console.log('  Example seeding skipped: auth token is not a test token.');
    return;
  }
  fixtures.userId = userId;

  const seedCode = `schemathesis-${Date.now()}`;
  try {
    const seedResponse = await postJson(`${baseUrl}${ApiEndpoint.Test.SeedAndRedeem}`, authToken, {
      code: seedCode,
      ac: 500,
      gp: 500,
    });
    if (!seedResponse.ok) {
      const text = await seedResponse.text().catch(() => '');
      console.log(`  Example seeding warning: seed-and-redeem returned ${seedResponse.status}${text ? ` - ${text}` : ''}`);
    } else {
      console.log(`  Seeded example credits with promo ${seedCode}`);
      fixtures.promoCode = seedCode;
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed credits (${String(error)})`);
  }

  try {
    const aiKeyResponse = await postJson(`${baseUrl}${ApiEndpoint.AI.KeysCustom}`, authToken, {
      providerId: fixtures.aiProviderId,
      apiKey: OpenApiExampleValue.AiApiKey,
      baseUrl: fixtures.aiMockBaseUrl,
    });
    if (!aiKeyResponse.ok) {
      const text = await aiKeyResponse.text().catch(() => '');
      console.log(`  Example seeding warning: AI key seed returned ${aiKeyResponse.status}${text ? ` - ${text}` : ''}`);
    } else {
      console.log(`  Seeded example AI key for ${fixtures.aiProviderId}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed AI key (${String(error)})`);
  }

  try {
    const transparentPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+X8cAAAAASUVORK5CYII=';
    const uploadImageResponse = await postJson(`${baseUrl}${ApiEndpoint.Assets.UploadImage}`, authToken, {
      hash: 'schemathesis-asset',
      content: transparentPngBase64,
      contentType: 'image/png',
    });
    if (!uploadImageResponse.ok) {
      const text = await uploadImageResponse.text().catch(() => '');
      console.log(`  Example seeding warning: asset seed returned ${uploadImageResponse.status}${text ? ` - ${text}` : ''}`);
    } else {
      const uploaded = await uploadImageResponse.json().catch(() => ({})) as { hash?: string };
      fixtures.assetHash = typeof uploaded.hash === 'string' && uploaded.hash.length > 0 ? uploaded.hash : OpenApiExampleValue.AssetHash;
      console.log(`  Seeded example asset with hash ${fixtures.assetHash || 'unknown'}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed asset (${String(error)})`);
  }

  const peerToken = `${TestTokenPrefix.Test}${userId}-peer`;
  try {
    const roomHostToken = `${TestTokenPrefix.Test}${userId}-room-host`;
    const roomResponse = await postJson(`${baseUrl}${ApiEndpoint.Rooms.Base}`, roomHostToken, {
      roomId: fixtures.roomId,
      hostId: userId,
      roomType: 'game',
      maxPlayers: 2,
    });
    if (roomResponse.ok) {
      const roomData = await roomResponse.json().catch(() => ({})) as { roomId?: string };
      if (roomData.roomId) {
        fixtures.roomId = roomData.roomId;
        console.log(`  Seeded room ${roomData.roomId} for spectator examples`);
      }
    } else {
      const text = await roomResponse.text().catch(() => '');
      console.log(`  Example seeding warning: room seed returned ${roomResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed room (${String(error)})`);
  }

  const seedTournamentBracket = async (tournamentId: string): Promise<{
    bracket?: Array<{ matchId?: string; playerA?: string; playerB?: string }>;
  }> => {
    const tournamentPath = `${baseUrl}${ApiEndpoint.Tournament.ById(tournamentId)}`;
    const registerPath = `${tournamentPath}/register`;
    const primaryRegister = await postJson(registerPath, authToken, {});
    if (!primaryRegister.ok) {
      const text = await primaryRegister.text().catch(() => '');
      console.log(`  Example seeding warning: tournament ${tournamentId} register returned ${primaryRegister.status}${text ? ` - ${text}` : ''}`);
      return {};
    }
    const peerRegister = await postJson(registerPath, peerToken, {});
    if (!peerRegister.ok) {
      const text = await peerRegister.text().catch(() => '');
      console.log(`  Example seeding warning: tournament ${tournamentId} peer registration returned ${peerRegister.status}${text ? ` - ${text}` : ''}`);
      return {};
    }
    const startResponse = await postJson(`${tournamentPath}/start`, authToken, {});
    if (!startResponse.ok) {
      const text = await startResponse.text().catch(() => '');
      console.log(`  Example seeding warning: tournament ${tournamentId} start returned ${startResponse.status}${text ? ` - ${text}` : ''}`);
      return {};
    }
    const startData = await startResponse.json().catch(() => ({})) as { bracket?: Array<{ matchId?: string; playerA?: string; playerB?: string }> };
    return {
      bracket: Array.isArray(startData.bracket) ? startData.bracket : [],
    };
  };

  try {
    const registerTournamentPath = `${baseUrl}${ApiEndpoint.Tournament.ById(fixtures.registerTournamentId)}/register`;
    const firstRegister = await postJson(registerTournamentPath, authToken, {});
    if (!firstRegister.ok) {
      const text = await firstRegister.text().catch(() => '');
      console.log(`  Example seeding warning: tournament register seed returned ${firstRegister.status}${text ? ` - ${text}` : ''}`);
    } else {
      console.log(`  Seeded tournament ${fixtures.registerTournamentId} for registration examples`);
    }

    const startTournament = await seedTournamentBracket(fixtures.startTournamentId);
    const startBracket = startTournament.bracket?.[0];
    if (startBracket?.matchId) {
      fixtures.tournamentResultMatchId = startBracket.matchId;
      fixtures.tournamentResultWinnerId = startBracket.playerA || startBracket.playerB || userId;
      console.log(`  Seeded tournament ${fixtures.startTournamentId} with two test players`);
    }

    const prizeTournament = await seedTournamentBracket(fixtures.prizeTournamentId);
    const prizeBracket = prizeTournament.bracket?.[0];
    if (prizeBracket?.matchId) {
      const prizeWinnerId = prizeBracket.playerA || prizeBracket.playerB || userId;
      const prizeResultPath = `${baseUrl}${ApiEndpoint.Tournament.ById(fixtures.prizeTournamentId)}/result`;
      const prizeResultResponse = await postJson(prizeResultPath, authToken, {
        matchId: prizeBracket.matchId,
        winnerId: prizeWinnerId,
      });
      if (!prizeResultResponse.ok) {
        const text = await prizeResultResponse.text().catch(() => '');
        console.log(`  Example seeding warning: tournament ${fixtures.prizeTournamentId} result returned ${prizeResultResponse.status}${text ? ` - ${text}` : ''}`);
      } else {
        console.log(`  Seeded tournament ${fixtures.prizeTournamentId} with prize-ready results`);
      }
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed tournament (${String(error)})`);
  }

  try {
    const matchFixtures = [
      readJsonFixture<Record<string, unknown>>('tests', 'fixtures', 'assets', 'match-human-victory.json'),
      readJsonFixture<Record<string, unknown>>('tests', 'fixtures', 'assets', 'match-human-loss.json'),
    ];
    const uploadedMatchIds: string[] = [];
    for (const matchFixture of matchFixtures) {
      const matchId = String(matchFixture.match_id ?? matchFixture.matchId ?? '');
      if (!matchId) continue;
      const response = await fetch(`${baseUrl}${ApiEndpoint.Matches.ById(matchId)}`, {
        method: 'PUT',
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${authToken}`,
          [HttpHeader.ContentType]: 'application/json',
        },
        body: JSON.stringify(matchFixture),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.log(`  Example seeding warning: leaderboard match seed returned ${response.status}${text ? ` - ${text}` : ''}`);
        continue;
      }
      uploadedMatchIds.push(matchId);
    }
    fixtures.leaderboardMatchIds = uploadedMatchIds;
    fixtures.archiveMatchId = uploadedMatchIds[0] ?? fixtures.archiveMatchId;
    const primaryPlayers = Array.isArray(matchFixtures[0]?.players) ? (matchFixtures[0]?.players as Array<{ player_id?: string }>) : [];
    fixtures.leaderboardUserId = primaryPlayers[0]?.player_id ?? fixtures.leaderboardUserId;
    fixtures.leaderboardGameType = typeof matchFixtures[0]?.gameType === 'number'
      ? (matchFixtures[0]?.gameType as number)
      : typeof matchFixtures[0]?.game_type === 'number'
        ? (matchFixtures[0]?.game_type as number)
        : fixtures.leaderboardGameType;
    if (uploadedMatchIds.length > 0) {
      const refreshResponse = await fetch(`${baseUrl}/cdn-cgi/handler/scheduled`, { method: 'GET' });
      if (!refreshResponse.ok) {
        await refreshResponse.text().catch(() => undefined);
      } else {
        console.log(`  Seeded leaderboard matches for ${uploadedMatchIds.length} example records`);
      }
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed leaderboard matches (${String(error)})`);
  }

  try {
    if (fixtures.archiveMatchId) {
      const signedUrlResponse = await fetch(`${baseUrl}${ApiEndpoint.SignedUrl.ByMatchId(fixtures.archiveMatchId)}`, {
        method: 'GET',
        headers: {
          [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${authToken}`,
        },
      });
      if (signedUrlResponse.ok) {
        const signedUrlData = await signedUrlResponse.json().catch(() => ({})) as { signedUrl?: string };
        const signedUrl = typeof signedUrlData.signedUrl === 'string' ? signedUrlData.signedUrl : '';
        if (signedUrl) {
          const token = new URL(signedUrl).searchParams.get(OpenApiParameterName.Token) ?? '';
          fixtures.matchToken = token;
          if (token) {
            console.log(`  Seeded signed URL token for match ${fixtures.archiveMatchId}`);
          }
        }
      } else {
        const text = await signedUrlResponse.text().catch(() => '');
        console.log(`  Example seeding warning: signed URL seed returned ${signedUrlResponse.status}${text ? ` - ${text}` : ''}`);
      }
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed signed URL token (${String(error)})`);
  }

  try {
    const moderationReport = await postJson(`${baseUrl}${ApiEndpoint.Admin.ModerationReport}`, authToken, {
      reporterId: userId,
      targetId: `${userId}-target`,
      reason: 'schemathesis seed',
    });
    if (moderationReport.ok) {
      const reportData = await moderationReport.json().catch(() => ({})) as { reportId?: string };
      if (reportData.reportId) {
        fixtures.moderationReportId = reportData.reportId;
        console.log(`  Seeded moderation report ${reportData.reportId} for resolve examples`);
      }
    } else {
      const text = await moderationReport.text().catch(() => '');
      console.log(`  Example seeding warning: moderation report seed returned ${moderationReport.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed moderation report (${String(error)})`);
  }

  try {
    const reserveResponse = await postJson(`${baseUrl}${ApiEndpoint.AI.EscrowReserve}`, authToken, {
      modelVersion: 'gpt-4o-mini',
      estimatedInputTokens: 64,
      estimatedOutputTokens: 16,
      idempotencyKey: `schemathesis-escrow-${Date.now()}`,
    });
    if (reserveResponse.ok) {
      const reserveData = await reserveResponse.json().catch(() => ({})) as { escrowId?: string };
      if (reserveData.escrowId) {
        fixtures.escrowId = reserveData.escrowId;
        console.log(`  Seeded AI escrow ${reserveData.escrowId} for consume examples`);
      }
    } else {
      const text = await reserveResponse.text().catch(() => '');
      console.log(`  Example seeding warning: escrow reserve returned ${reserveResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed AI escrow (${String(error)})`);
  }

  try {
    const sellerAuthToken = `${TestTokenPrefix.Test}schemathesis-seller`;
     const listingResponse = await postJson(`${baseUrl}${ApiEndpoint.Marketplace.Sell}`, sellerAuthToken, {
       ...OpenApiExampleValue.MarketplaceSellRequest,
       itemId: `schemathesis-item-${Date.now()}`,
     });
    if (listingResponse.ok) {
      const listingData = await listingResponse.json().catch(() => ({})) as { listingId?: string };
      if (listingData.listingId) {
        fixtures.listingId = listingData.listingId;
        console.log(`  Seeded marketplace listing ${listingData.listingId} for buy examples`);
      }
    } else {
      const text = await listingResponse.text().catch(() => '');
      console.log(`  Example seeding warning: marketplace sell returned ${listingResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed marketplace listing (${String(error)})`);
  }

  try {
    const conversationId = `schemathesis-${userId}-conversation`;
    const messageResponse = await postJson(`${baseUrl}${ApiEndpoint.Message.ByConversation(conversationId)}/send`, authToken, {
      content: 'Schemathesis seed message',
    });
    if (!messageResponse.ok) {
      const text = await messageResponse.text().catch(() => '');
      console.log(`  Example seeding warning: message seed returned ${messageResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed message conversation (${String(error)})`);
  }

  try {
    const friendId = `${userId}-friend`;
    const friendResponse = await postJson(`${baseUrl}${ApiEndpoint.Friends.ById(friendId)}`, authToken, {
      friendId,
    });
    if (!friendResponse.ok) {
      const text = await friendResponse.text().catch(() => '');
      console.log(`  Example seeding warning: friends seed returned ${friendResponse.status}${text ? ` - ${text}` : ''}`);
    } else {
      fixtures.friendId = friendId;
      console.log(`  Seeded friend ${friendId} for friends examples`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed friends (${String(error)})`);
  }

  try {
    const profileResponse = await postJson(`${baseUrl}${ApiEndpoint.Profile.ById(userId)}/update`, authToken, {
      displayName: 'Schemathesis User',
      bio: 'seeded for schemathesis',
    });
    if (!profileResponse.ok) {
      const text = await profileResponse.text().catch(() => '');
      console.log(`  Example seeding warning: profile seed returned ${profileResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed profile (${String(error)})`);
  }

  try {
    const settingsResponse = await postJson(`${baseUrl}${ApiEndpoint.Settings.ByUser(userId)}/update`, authToken, {
      theme: 'dark',
    });
    if (!settingsResponse.ok) {
      const text = await settingsResponse.text().catch(() => '');
      console.log(`  Example seeding warning: settings seed returned ${settingsResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed settings (${String(error)})`);
  }

  try {
    const inventoryAddResponse = await postJson(`${baseUrl}${ApiEndpoint.Inventory.AddItem}`, authToken, {
      itemId: `schemathesis-item-${Date.now()}`,
      type: 'card',
      count: 1,
    });
    if (inventoryAddResponse.ok) {
      const inventoryData = await inventoryAddResponse.json().catch(() => ({})) as { itemId?: string };
      const itemId = inventoryData.itemId ?? '';
      if (itemId) {
        const equipResponse = await postJson(`${baseUrl}${ApiEndpoint.Inventory.Equip}`, authToken, {
          itemId,
          slot: 'hand',
        });
        if (!equipResponse.ok) {
          const text = await equipResponse.text().catch(() => '');
          console.log(`  Example seeding warning: inventory equip returned ${equipResponse.status}${text ? ` - ${text}` : ''}`);
        }
      }
    } else {
      const text = await inventoryAddResponse.text().catch(() => '');
      console.log(`  Example seeding warning: inventory seed returned ${inventoryAddResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed inventory (${String(error)})`);
  }

  try {
    const progressionResponse = await postJson(`${baseUrl}${ApiEndpoint.Progression.Xp}`, authToken, {
      amount: 100,
    });
    if (!progressionResponse.ok) {
      const text = await progressionResponse.text().catch(() => '');
      console.log(`  Example seeding warning: progression seed returned ${progressionResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed progression (${String(error)})`);
  }

  try {
    const rewardsResponse = await postJson(`${baseUrl}${ApiEndpoint.Rewards.DailyClaim}`, authToken, {
      idempotencyKey: OpenApiExampleValue.IdempotencyKeyEarn,
    });
    if (!rewardsResponse.ok) {
      const text = await rewardsResponse.text().catch(() => '');
      console.log(`  Example seeding warning: rewards seed returned ${rewardsResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed rewards (${String(error)})`);
  }

  try {
    const securityResponse = await postJson(`${baseUrl}${ApiEndpoint.Security.Penalty}/issue`, authToken, {
      userId,
      type: 'warning',
      reason: 'schemathesis seed',
      issuedBy: userId,
    });
    if (!securityResponse.ok) {
      const text = await securityResponse.text().catch(() => '');
      console.log(`  Example seeding warning: security seed returned ${securityResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed security (${String(error)})`);
  }

  try {
    const fraudResponse = await postJson(`${baseUrl}${ApiEndpoint.Fraud.Check}`, authToken, {
      amount: OpenApiExampleValue.FraudCheckRequest.amount,
      paymentMethod: OpenApiExampleValue.FraudCheckRequest.paymentMethod,
      currency: OpenApiExampleValue.FraudCheckRequest.currency,
    });
    if (!fraudResponse.ok) {
      const text = await fraudResponse.text().catch(() => '');
      console.log(`  Example seeding warning: fraud seed returned ${fraudResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed fraud (${String(error)})`);
  }

  try {
    const antiCheatResponse = await postJson(`${baseUrl}${ApiEndpoint.AntiCheat.Analyze}`, authToken, {
      matchId: fixtures.leaderboardMatchIds[0] ?? fixtures.startTournamentId,
      events: [],
      moveTimingMs: [100],
    });
    if (!antiCheatResponse.ok) {
      const text = await antiCheatResponse.text().catch(() => '');
      console.log(`  Example seeding warning: anti-cheat seed returned ${antiCheatResponse.status}${text ? ` - ${text}` : ''}`);
    }
  } catch (error) {
    console.log(`  Example seeding warning: failed to seed anti-cheat (${String(error)})`);
  }
}

async function checkWorkerHealth(url: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => resolve(true));
  });
}

function createRollingBuffer(maxChars = 20000): { append: (text: string) => void; getText: () => string } {
  const chunks: string[] = [];
  let size = 0;

  return {
    append(text: string) {
      chunks.push(text);
      size += text.length;
      while (size > maxChars && chunks.length > 1) {
        size -= chunks.shift()!.length;
      }
    },
    getText() {
      return chunks.join('');
    },
  };
}

function startWorkerProcess(port: number): WorkerStartHandle {
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';
  const stdoutBuffer = createRollingBuffer();
  const stderrBuffer = createRollingBuffer();
  const status = {
    exited: false,
    exitCode: null as number | null,
    signal: null as NodeJS.Signals | null,
    error: undefined as string | undefined,
  };
  const child = spawn(npmCommand, ['run', 'worker:start'], {
    cwd: cloudflareDir,
    env: { ...process.env, WORKER_HTTP_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: isWindows,
    windowsHide: true,
  });

  child.stdout?.on('data', (data) => {
    stdoutBuffer.append(data.toString());
  });
  child.stderr?.on('data', (data) => {
    stderrBuffer.append(data.toString());
  });
  child.on('error', (error) => {
    status.exited = true;
    status.error = error.message;
  });
  child.on('close', (exitCode, signal) => {
    status.exited = true;
    status.exitCode = exitCode;
    status.signal = signal;
  });

  return {
    child,
    getOutput: () => {
      const stdout = stdoutBuffer.getText().trim();
      const stderr = stderrBuffer.getText().trim();
      return [stdout, stderr].filter((value) => value.length > 0).join('\n');
    },
    getStatus: () => ({ ...status }),
  };
}

function getPortOwners(port: number): PortOwner[] {
  try {
    if (process.platform === 'win32') {
      const script = `
$matches = netstat -ano -p tcp | Select-String ':${port}\\s+.*LISTENING\\s+(\\d+)\\s*$'
$pids = @($matches | ForEach-Object { if ($_.Matches.Count -gt 0) { $_.Matches[0].Groups[1].Value } } | Select-Object -Unique)
foreach ($pid in $pids) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pid"
  if ($proc) {
    [pscustomobject]@{
      pid = [int]$pid
      name = [string]$proc.Name
      command = [string]$proc.CommandLine
    } | ConvertTo-Json -Compress
  }
}
`;
      const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf-8',
        windowsHide: true,
      }).trim();
      if (!output) {
        return [];
      }
      return output
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as PortOwner)
        .filter((owner) => Number.isFinite(owner.pid));
    }

    const output = execFileSync('sh', ['-lc', `for pid in $(lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null | sort -u); do ps -p "$pid" -o pid=,comm=,args=; done`], {
      encoding: 'utf-8',
    }).trim();
    if (!output) {
      return [];
    }
    const owners: PortOwner[] = [];
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const match = line.match(/^(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) {
        continue;
      }

      const pid = Number.parseInt(match[1], 10);
      if (!Number.isFinite(pid)) {
        continue;
      }

      owners.push({
        pid,
        name: match[2],
        command: match[3],
      });
    }

    return owners;
  } catch {
    return [];
  }
}

function isKnownWorkerOwner(owner: PortOwner): boolean {
  const haystack = `${owner.name ?? ''} ${owner.command ?? ''}`;
  return /workerd(\.exe)?\b|wrangler(\.cmd)?\s+dev|npm(\.cmd)?\s+run\s+worker:start|start-worker-server\.ts/i.test(haystack);
}

function formatPortOwners(owners: PortOwner[]): string {
  return owners
    .map((owner) => `pid=${owner.pid} name=${owner.name ?? 'unknown'} command=${owner.command ?? 'unknown'}`)
    .join('\n');
}

function terminateProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      return;
    }
    process.kill(pid, 'SIGTERM');
  } catch {
    void 0;
  }
}

async function waitForPortRelease(port: number, maxWaitSeconds = 10): Promise<boolean> {
  const deadline = Date.now() + maxWaitSeconds * 1000;
  while (Date.now() < deadline) {
    const portInUse = await checkPortInUse(port);
    if (!portInUse) {
      return true;
    }
    await sleep(250);
  }
  return !(await checkPortInUse(port));
}

async function ensureWorker(port: number): Promise<WorkerEnsureResult> {
  if (await checkWorkerHealth(workerHealthUrl)) {
    console.log(`  Worker already healthy on port ${port}; continuing.`);
    return { ok: true, started: false };
  }

  const portInUse = await checkPortInUse(port);
  if (portInUse) {
    console.warn(`  Port ${port} is in use but ${ApiEndpoint.Health} is not healthy.`);
    const owners = getPortOwners(port);
    if (owners.length === 0) {
      return {
        ok: false,
        started: false,
        reason: 'port_in_use_unknown_owner',
        details: `Port ${port} is occupied, but the owning process could not be identified.`,
      };
    }

    const knownOwners = owners.filter(isKnownWorkerOwner);
    if (knownOwners.length !== owners.length) {
      return {
        ok: false,
        started: false,
        reason: 'port_in_use_non_worker',
        details: `Port ${port} is occupied by a non-worker process:\n${formatPortOwners(owners)}`,
      };
    }

    console.log(`  Recycling stale worker on port ${port}...`);
    for (const owner of knownOwners) {
      terminateProcessTree(owner.pid);
    }

    const released = await waitForPortRelease(port, 10);
    if (!released && !(await checkWorkerHealth(workerHealthUrl))) {
      return {
        ok: false,
        started: false,
        reason: 'port_release_timeout',
        details: `Timed out waiting for port ${port} to be released.\n${formatPortOwners(owners)}`,
      };
    }

    if (await checkWorkerHealth(workerHealthUrl)) {
      console.log(`  Worker on port ${port} became healthy after recycle; continuing.`);
      return { ok: true, started: false };
    }
  }

  console.log('  Starting worker (npm run worker:start)...');
  const workerHandle = startWorkerProcess(port);
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await checkWorkerHealth(workerHealthUrl)) {
      const cleanup = () => {
        if (!workerHandle.child.killed && workerHandle.child.exitCode === null && workerHandle.child.pid) {
          terminateProcessTree(workerHandle.child.pid);
        }
      };
      process.once('exit', cleanup);
      process.once('SIGINT', () => {
        cleanup();
        process.exit(130);
      });
      process.once('SIGTERM', () => {
        cleanup();
        process.exit(143);
      });
      return { ok: true, started: true, cleanup };
    }
    const status = workerHandle.getStatus();
    if (status.exited) {
      const workerOutput = workerHandle.getOutput();
      const exitDetails = status.error
        ? `Worker start failed: ${status.error}`
        : `Worker exited with code ${status.exitCode ?? 'unknown'}${status.signal ? ` signal ${status.signal}` : ''}`;
      const output = workerOutput.length > 0 ? `${exitDetails}\n${workerOutput}` : exitDetails;
      return {
        ok: false,
        started: true,
        reason: 'worker_start_failed',
        details: output,
      };
    }
    await sleep(1000);
  }

  const workerOutput = workerHandle.getOutput();
  if (!workerHandle.child.killed && workerHandle.child.exitCode === null && workerHandle.child.pid) {
    try {
      terminateProcessTree(workerHandle.child.pid);
    } catch {
      void 0;
    }
  }

  return {
    ok: false,
    started: true,
    reason: 'worker_start_timeout',
    details: workerOutput.length > 0 ? workerOutput : `Worker did not become healthy on port ${port}.`,
  };
}

function ensureSchemathesisInstalled(): boolean {
  try {
    execFileSync('schemathesis', ['--version'], {
      encoding: 'utf-8',
      env: getSchemathesisEnv(),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function findFirstArtifact(reportDir: string, extension: '.ndjson' | '.xml'): string | undefined {
  if (!fs.existsSync(reportDir)) {
    return undefined;
  }
  const files = fs.readdirSync(reportDir)
    .filter((fileName) => fileName.endsWith(extension))
    .sort((left, right) => left.localeCompare(right));
  if (files.length === 0) {
    return undefined;
  }
  return path.join(reportDir, files[0]);
}

function copyReportSet(run: SchemathesisPhaseRun, ndjsonDestination: string, junitDestination: string): { ndjson?: string; junit?: string } {
  return {
    ndjson: copyArtifactToWorkspace(run.ndjsonReportPath, ndjsonDestination),
    junit: copyArtifactToWorkspace(run.junitReportPath, junitDestination),
  };
}

function copyArtifactToWorkspace(sourcePath: string | undefined, destinationPath: string): string | undefined {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return undefined;
  }
  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath;
}

function parseSchemathesisOutput(output: string): {
  testCases?: number;
  failures?: number;
  errors?: number;
  errorCategories?: Record<string, number>;
  errorMessages?: string[];
} {
  try {
    const testCasesMatch = output.match(/(\d+)\s+generated/i) || output.match(/(\d+)\s+test cases?/i);
    const failuresMatch = output.match(/(\d+)\s+failures?/i);
    const errorsMatch = output.match(/(\d+)\s+error/i);
    const errorCategories: Record<string, number> = {};
    const categoryPatterns = [
      { pattern: /❌\s+API accepts requests without authentication:\s+(\d+)/i, key: 'missing_auth' },
      { pattern: /❌\s+Server error:\s+(\d+)/i, key: 'server_error' },
      { pattern: /❌\s+Response violates schema:\s+(\d+)/i, key: 'schema_violation' },
      { pattern: /❌\s+API accepted schema-violating request:\s+(\d+)/i, key: 'invalid_data_accepted' },
      { pattern: /❌\s+API rejected schema-compliant request:\s+(\d+)/i, key: 'valid_data_rejected' },
      { pattern: /❌\s+Missing header not rejected:\s+(\d+)/i, key: 'missing_header' },
      { pattern: /❌\s+Undocumented Content-Type:\s+(\d+)/i, key: 'undocumented_content_type' },
      { pattern: /❌\s+Undocumented HTTP status code:\s+(\d+)/i, key: 'undocumented_status' },
      { pattern: /❌\s+Unsupported methods:\s+(\d+)/i, key: 'unsupported_method' },
    ];

    for (const { pattern, key } of categoryPatterns) {
      const match = output.match(pattern);
      if (match?.[1]) {
        errorCategories[key] = Number.parseInt(match[1], 10);
      }
    }

    const errorMessages: string[] = [];
    const errorPatterns = [
      /Error:\s*([^\n]+)/gi,
      /FAILED:\s*([^\n]+)/gi,
      /Exception:\s*([^\n]+)/gi,
      /Network Error[\s\S]*?Reproduce with:[\s\S]*?curl[^\n]+/gi,
    ];

    for (const pattern of errorPatterns) {
      const matches = output.matchAll(pattern);
      for (const match of matches) {
        const value = match[1] ?? match[0];
        if (value && !errorMessages.includes(value)) {
          errorMessages.push(value.trim());
        }
      }
    }

    return {
      testCases: testCasesMatch ? Number.parseInt(testCasesMatch[1], 10) : undefined,
      failures: failuresMatch ? Number.parseInt(failuresMatch[1], 10) : undefined,
      errors: errorsMatch ? Number.parseInt(errorsMatch[1], 10) : undefined,
      errorCategories: Object.keys(errorCategories).length > 0 ? errorCategories : undefined,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  } catch {
    return {};
  }
}
void parseSchemathesisOutput;

function parseJunitSummary(junitPath: string | undefined): JunitSummary {
  if (!junitPath || !fs.existsSync(junitPath)) {
    return {};
  }

  try {
    const xml = fs.readFileSync(junitPath, 'utf-8');
    const tagMatch = xml.match(/<(testsuite|testsuites)\b([^>]*)>/i);
    if (!tagMatch) {
      return {};
    }

    const attributes = tagMatch[2];
    const readNumber = (name: string): number | undefined => {
      const match = attributes.match(new RegExp(`\\b${name}="([^"]+)"`, 'i'));
      if (!match?.[1]) {
        return undefined;
      }
      const value = Number(match[1]);
      return Number.isFinite(value) ? value : undefined;
    };

    return {
      testCases: readNumber('tests'),
      failures: readNumber('failures'),
      errors: readNumber('errors'),
      skipped: readNumber('skipped'),
      duration: readNumber('time'),
    };
  } catch {
    return {};
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function stripXmlTags(value: string): string {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function getXmlAttribute(source: string, attribute: string): string | undefined {
  const match = source.match(new RegExp(`\\b${attribute}="([^"]*)"`, 'i'));
  return match?.[1] ? decodeXmlEntities(match[1]) : undefined;
}

function parseJunitCases(junitPath: string | undefined): SchemathesisCase[] {
  if (!junitPath || !fs.existsSync(junitPath)) {
    return [];
  }

  try {
    const xml = fs.readFileSync(junitPath, 'utf-8');
    const cases: SchemathesisCase[] = [];
    const testcasePattern = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/gi;
    let testcaseMatch: RegExpExecArray | null;

    while ((testcaseMatch = testcasePattern.exec(xml)) !== null) {
      const attributes = testcaseMatch[1] ?? '';
      const body = testcaseMatch[2] ?? '';
      const name = getXmlAttribute(attributes, 'name') ?? 'unknown';
      const timeValue = getXmlAttribute(attributes, 'time');
      const time = timeValue ? Number.parseFloat(timeValue) : undefined;
      const skippedMatch = body.match(/<skipped\b([^>]*)>([\s\S]*?)<\/skipped>/i) ?? body.match(/<skipped\b([^>]*)\/>/i);
      const failureMatch = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/i) ?? body.match(/<(failure|error)\b([^>]*)\/>/i);

      if (skippedMatch) {
        const skippedAttributes = skippedMatch[1] ?? '';
        const skippedBody = skippedMatch[2] ?? '';
        const reason = stripXmlTags(
          getXmlAttribute(skippedAttributes, 'message')
            ?? getXmlAttribute(skippedAttributes, 'type')
            ?? skippedBody
        ) || 'Skipped';
        cases.push({
          name,
          status: 'skipped',
          time,
          reason,
          details: reason,
        });
        continue;
      }

      if (failureMatch) {
        const failureType = failureMatch[1]?.toLowerCase() === 'error' ? 'error' : 'failed';
        const failureAttributes = failureMatch[2] ?? '';
        const failureBody = failureMatch[3] ?? '';
        const message = stripXmlTags(
          getXmlAttribute(failureAttributes, 'message')
            ?? getXmlAttribute(failureAttributes, 'type')
            ?? failureBody
        ) || (failureType === 'error' ? 'Test error' : 'Test failed');
        cases.push({
          name,
          status: failureType,
          time,
          reason: message,
          details: message,
        });
        continue;
      }

      cases.push({
        name,
        status: 'passed',
        time,
      });
    }

    return cases;
  } catch {
    return [];
  }
}

function summarizeCases(cases: SchemathesisCase[]): SchemathesisCaseSummary {
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;

  for (const testCase of cases) {
    if (testCase.status === 'passed') {
      passed += 1;
      continue;
    }
    if (testCase.status === 'failed') {
      failed += 1;
      continue;
    }
    if (testCase.status === 'error') {
      errors += 1;
      continue;
    }
    skipped += 1;
  }

  return {
    cases,
    passed,
    failed,
    errors,
    skipped,
  };
}

function formatCaseReason(reason: string | undefined): string {
  if (!reason) {
    return 'no reason provided';
  }
  return reason.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] ?? reason.trim();
}

function formatCaseLine(testCase: SchemathesisCase): string {
  const marker = testCase.status === 'passed' ? 'PASS' : testCase.status === 'skipped' ? 'SKIP' : 'FAIL';
  const reason = testCase.reason ? ` - ${formatCaseReason(testCase.reason)}` : '';
  return `  ${marker} ${testCase.name}${reason}`;
}

function writeLogFile(filePath: string, sections: Array<string | undefined>): void {
  const content = sections.filter((section): section is string => Boolean(section && section.trim().length > 0)).join('\n\n');
  fs.writeFileSync(filePath, content, 'utf-8');
}

function buildExamplesSummaryText(params: {
  includePath?: string;
  exampleGapRows: ExampleGapRow[];
  exampleGapCount: number;
  run: SchemathesisPhaseRun;
  reports: { junit?: string; ndjson?: string; story?: string; text?: string };
}): string {
  const gapLines = params.exampleGapRows.length > 0
    ? params.exampleGapRows.flatMap((row) => [`  - ${row.operation}`, ...row.gaps.map((gap) => `    - ${gap}`)])
    : ['  - None'];

  return [
    '[run-schemathesis] Examples report',
    `  Included path filter: ${params.includePath ?? '(none)'}`,
    `  Missing example operations: ${params.exampleGapCount}`,
    '  Gap audit:',
    ...gapLines,
    '',
    buildPhaseSummary('Examples', params.run, 'examples'),
    '',
    '  Read first:',
    `  - Text summary: ${params.reports.text ?? schemathesisExamplesSummaryTxtPath}`,
    `  - Story NDJSON: ${params.reports.story ?? schemathesisExamplesStoryNdjsonPath}`,
    '  Machine outputs:',
    `  - Raw Schemathesis NDJSON: ${params.reports.ndjson ?? 'n/a'}`,
    `  - JUnit XML for CI: ${params.reports.junit ?? 'n/a'}`,
    `  - Results JSON: ${schemathesisExamplesResultsJsonPath}`,
  ].join('\n');
}

function initializeExamplesStoryJournal(params: {
  includePath?: string;
  exampleGapRows: ExampleGapRow[];
  exampleGapCount: number;
  storyPath: string;
}): void {
  resetFile(params.storyPath);
  appendNdjsonEntry(params.storyPath, {
    type: 'examples-run-start',
    startedAt: new Date().toISOString(),
    includePath: params.includePath ?? null,
  });
  appendNdjsonEntry(params.storyPath, {
    type: 'example-gap-audit-summary',
    missingExampleOperations: params.exampleGapCount,
    operationsExamined: params.exampleGapRows.length,
    includePath: params.includePath ?? null,
  });
  for (const row of params.exampleGapRows) {
    appendNdjsonEntry(params.storyPath, {
      type: 'example-gap',
      operation: row.operation,
      gaps: row.gaps,
    });
  }
}

function appendExamplesRunJournal(params: {
  storyPath: string;
  includePath?: string;
  exampleGapRows: ExampleGapRow[];
  exampleGapCount: number;
  run: SchemathesisPhaseRun;
  reports: { junit?: string; ndjson?: string; story?: string; text?: string };
}): void {
  appendNdjsonEntry(params.storyPath, {
    type: 'examples-run-summary',
    status: params.run.code === 0 ? 'passed' : 'failed',
    exitCode: params.run.code,
    duration: params.run.duration,
    testCases: params.run.junitSummary.testCases ?? params.run.caseSummary.cases.length,
    passed: params.run.caseSummary.passed,
    failed: params.run.caseSummary.failed,
    errors: params.run.caseSummary.errors,
    skipped: params.run.caseSummary.skipped,
    includePath: params.includePath ?? null,
    reports: params.reports,
  });

  for (const testCase of params.run.caseSummary.cases) {
    appendNdjsonEntry(params.storyPath, {
      type: 'example-case',
      name: testCase.name,
      status: testCase.status,
      time: testCase.time,
      reason: testCase.reason,
      details: testCase.details,
    });
  }

  appendNdjsonEntry(params.storyPath, {
    type: 'examples-run-final',
    status: params.run.code === 0 ? 'passed' : 'failed',
    exitCode: params.run.code,
    summary: params.run.code === 0 ? 'Examples completed' : `Examples exited with code ${params.run.code}`,
    exampleGapCount: params.exampleGapCount,
    reports: params.reports,
  });
}

function buildPhaseSummary(phaseName: string, run: SchemathesisPhaseRun, reportLabel: string): string {
  const totalCases = run.caseSummary.cases.length;
  const lines = [
    `[run-schemathesis] ${phaseName} summary`,
    `  Report label: ${reportLabel}`,
    `  Duration: ${run.duration.toFixed(1)}s`,
    `  Test cases: ${totalCases}`,
    `  Passed: ${run.caseSummary.passed}`,
    `  Failed: ${run.caseSummary.failed}`,
    `  Errors: ${run.caseSummary.errors}`,
    `  Skipped: ${run.caseSummary.skipped}`,
    `  JUnit: ${run.junitWorkspacePath ?? run.junitReportPath ?? 'n/a'}`,
    `  NDJSON: ${run.ndjsonWorkspacePath ?? run.ndjsonReportPath ?? 'n/a'}`,
  ];

  const failures = run.caseSummary.cases.filter((testCase) => testCase.status === 'failed' || testCase.status === 'error');
  const skipped = run.caseSummary.cases.filter((testCase) => testCase.status === 'skipped');

  if (failures.length > 0) {
    lines.push('  Failures:');
    for (const testCase of failures) {
      lines.push(formatCaseLine(testCase));
    }
  }

  if (skipped.length > 0) {
    lines.push('  Skipped:');
    for (const testCase of skipped) {
      lines.push(formatCaseLine(testCase));
    }
  }

  return lines.join('\n');
}

async function runExamplesPhase(params: {
  schemaPath: string;
  baseUrl: string;
  authToken: string;
  runtimeFixtures: SchemathesisRuntimeFixtures;
  maxExamples: string;
  workers: string;
  requestTimeoutSeconds: string;
  timeoutMs: number;
  includePath?: string;
  includeMethod?: string;
  onOutputChunk?: (stream: 'stdout' | 'stderr', text: string) => void;
}): Promise<{
  run: SchemathesisPhaseRun;
  reports: { junit?: string; ndjson?: string };
  summaryText: string;
}> {
  const runtimeDir = createRuntimeArtifactsDir();
  const reportDir = path.join(runtimeDir, 'examples');
  ensureDir(reportDir);
  writeSchemathesisHooksFile(runtimeDir, params.runtimeFixtures);

  const run = await runSchemathesisPhase({
    phaseName: 'Examples',
    runtimeDir,
    schemaPath: params.schemaPath,
    baseUrl: params.baseUrl,
    reportDir,
    phases: 'examples',
    includePath: params.includePath,
    includeMethod: params.includeMethod,
    authToken: params.authToken,
    maxExamples: params.maxExamples,
    workers: params.workers,
    requestTimeoutSeconds: params.requestTimeoutSeconds,
    timeoutMs: params.timeoutMs,
    onOutputChunk: params.onOutputChunk,
  });

  const reports = copyReportSet(run, schemathesisExamplesWorkspaceNdjsonPath, schemathesisExamplesWorkspaceJunitPath);
  const summaryText = buildPhaseSummary('Examples', {
    ...run,
    ndjsonWorkspacePath: reports.ndjson,
    junitWorkspacePath: reports.junit,
  }, 'examples');

  writeLogFile(schemathesisExamplesWorkspaceLogPath, [
    run.output,
    summaryText,
    `Artifacts:\n  JUnit: ${reports.junit ?? 'n/a'}\n  NDJSON: ${reports.ndjson ?? 'n/a'}`,
  ]);

  writeJson(schemathesisExamplesResultsJsonPath, {
    name: 'Schemathesis API Examples',
    phase: 'examples',
    status: run.code === 0 ? 'passed' : 'failed',
    exitCode: run.code,
    duration: run.duration,
    summary: run.code === 0 ? 'Examples completed' : `Examples exited with code ${run.code}`,
    testCases: run.junitSummary.testCases ?? run.caseSummary.cases.length,
    failures: run.junitSummary.failures ?? run.caseSummary.failed,
    errors: run.junitSummary.errors ?? run.caseSummary.errors,
    skipped: run.junitSummary.skipped ?? run.caseSummary.skipped,
    cases: run.caseSummary.cases,
    reports: {
      junit: reports.junit,
      ndjson: reports.ndjson,
    },
    runtime: {
      liveOutput: run.liveOutput,
      schemaPath: run.schemaPath,
    },
  });

  return { run, reports, summaryText };
}

async function runFuzzingPhase(params: {
  schemaPath: string;
  baseUrl: string;
  authToken: string;
  runtimeFixtures: SchemathesisRuntimeFixtures;
  maxExamples: string;
  workers: string;
  requestTimeoutSeconds: string;
  timeoutMs: number;
  includePath?: string;
  includeMethod?: string;
  phases: string;
  onOutputChunk?: (stream: 'stdout' | 'stderr', text: string) => void;
}): Promise<{
  run: SchemathesisPhaseRun;
  reports: { junit?: string; ndjson?: string };
  summaryText: string;
}> {
  const runtimeDir = createRuntimeArtifactsDir();
  const reportDir = path.join(runtimeDir, 'actual');
  ensureDir(reportDir);
  writeSchemathesisHooksFile(runtimeDir, params.runtimeFixtures);

  const run = await runSchemathesisPhase({
    phaseName: 'Fuzzing',
    runtimeDir,
    schemaPath: params.schemaPath,
    baseUrl: params.baseUrl,
    reportDir,
    phases: params.phases,
    includePath: params.includePath,
    includeMethod: params.includeMethod,
    authToken: params.authToken,
    maxExamples: params.maxExamples,
    workers: params.workers,
    requestTimeoutSeconds: params.requestTimeoutSeconds,
    timeoutMs: params.timeoutMs,
    onOutputChunk: params.onOutputChunk,
  });

  const reports = copyReportSet(run, schemathesisWorkspaceNdjsonPath, schemathesisWorkspaceJunitPath);
  const summaryText = buildPhaseSummary('Fuzzing', {
    ...run,
    ndjsonWorkspacePath: reports.ndjson,
    junitWorkspacePath: reports.junit,
  }, params.phases);

  writeLogFile(schemathesisWorkspaceLogPath, [
    run.output,
    summaryText,
    `Artifacts:\n  JUnit: ${reports.junit ?? 'n/a'}\n  NDJSON: ${reports.ndjson ?? 'n/a'}\n  Runtime: ${runtimeDir}`,
  ]);

  return { run, reports, summaryText };
}

function parseRequestedPhases(value: string | undefined): string[] {
  const raw = value ?? 'examples,fuzzing';
  return raw
    .split(',')
    .map((phase) => phase.trim())
    .filter((phase) => phase.length > 0);
}

function buildSchemathesisArgs(params: {
  schemaPath: string;
  baseUrl: string;
  reportDir: string;
  phases?: string;
  includePath?: string;
  includeMethod?: string;
  authToken: string;
  maxExamples: string;
  workers: string;
  requestTimeoutSeconds: string;
}): string[] {
  const args = [
    'run',
    '--url', params.baseUrl,
    '--checks', 'all',
    '--max-examples', params.maxExamples,
    '--workers', params.workers,
    '--wait-for-schema', '30',
    '--request-timeout', params.requestTimeoutSeconds,
    '--generation-database', 'none',
    '--report', 'junit,ndjson',
    '--report-dir', params.reportDir,
    '--header', `${HttpHeader.Authorization}:${HttpAuthScheme.Bearer} ${params.authToken}`,
  ];

  if (params.phases) {
    args.push('--phases', params.phases);
  }

  if (params.includePath) {
    args.push('--include-path-regex', params.includePath);
  }

  if (params.includeMethod) {
    args.push('--include-method', params.includeMethod);
  }

  args.push(params.schemaPath);
  return args;
}

async function runSchemathesisPhase(params: {
  phaseName: string;
  runtimeDir: string;
  schemaPath: string;
  baseUrl: string;
  reportDir: string;
  phases: string;
  includePath?: string;
  includeMethod?: string;
  authToken: string;
  maxExamples: string;
  workers: string;
  requestTimeoutSeconds: string;
  timeoutMs: number;
  onOutputChunk?: (stream: 'stdout' | 'stderr', text: string) => void;
}): Promise<SchemathesisPhaseRun> {
  const args = buildSchemathesisArgs({
    schemaPath: params.schemaPath,
    baseUrl: params.baseUrl,
    reportDir: params.reportDir,
    phases: params.phases,
    includePath: params.includePath,
    includeMethod: params.includeMethod,
    authToken: params.authToken,
    maxExamples: params.maxExamples,
    workers: params.workers,
    requestTimeoutSeconds: params.requestTimeoutSeconds,
  });
  const startTime = Date.now();
  const { code, output, liveOutput } = await runSchemathesisWithOutput(args, params.timeoutMs, params.runtimeDir, params.onOutputChunk);
  const duration = (Date.now() - startTime) / 1000;
  const ndjsonReportPath = findFirstArtifact(params.reportDir, '.ndjson');
  const junitReportPath = findFirstArtifact(params.reportDir, '.xml');
  const junitSummary = parseJunitSummary(junitReportPath);
  const caseSummary = summarizeCases(parseJunitCases(junitReportPath));

  return {
    name: params.phaseName,
    code,
    output,
    liveOutput,
    duration,
    runtimeDir: path.dirname(params.reportDir),
    reportDir: params.reportDir,
    ndjsonReportPath,
    junitReportPath,
    junitSummary,
    caseSummary,
    schemaPath: params.schemaPath,
  };
}

function runSchemathesis(args: string[], timeoutMs: number): Promise<SchemathesisRunResult> {
  return runSchemathesisWithOutput(args, timeoutMs);
}
void runSchemathesis;

function runSchemathesisWithOutput(
  args: string[],
  timeoutMs: number,
  runtimeDir?: string,
  onChunk?: (stream: 'stdout' | 'stderr', text: string) => void,
): Promise<SchemathesisRunResult> {
  return new Promise((resolve) => {
    const liveOutput = true;
    const output = '';
    let resolved = false;
    void onChunk;
    const child = spawn('schemathesis', args, {
      cwd: cloudflareDir,
      env: getSchemathesisEnv(runtimeDir),
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });

    const timeoutId = setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      try {
        child.kill('SIGTERM');
      } catch {
        void 0;
      }
      resolve({ code: 124, output, liveOutput });
    }, timeoutMs);

    child.on('close', (code) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeoutId);
      resolve({ code: code ?? 0, output, liveOutput });
    });

    child.on('error', (error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeoutId);
      resolve({ code: 1, output: error.message, liveOutput });
    });
  });
}

async function main(): Promise<void> {
  const { reportExamples, examplesOnly, includePath } = parseArgs(process.argv.slice(2));

  if (reportExamples) {
    const missingCount = reportExampleGaps(process.env.TARGET_ENDPOINT ?? includePath);
    process.exit(missingCount > 0 ? 1 : 0);
  }

  console.log('[run-schemathesis] Schemathesis API fuzzing\n');
  const requestedPhases = parseRequestedPhases(process.env.SCHEMATHESIS_PHASES?.trim());
  const splitExamplesAndFuzzing = requestedPhases.length === 2 && requestedPhases[0] === 'examples' && requestedPhases[1] === 'fuzzing';
  const includeTarget = process.env.TARGET_ENDPOINT?.trim() || includePath;
  const exampleGapRows = examplesOnly || splitExamplesAndFuzzing ? collectExampleGapRows(includeTarget) : [];
  const exampleGapCount = exampleGapRows.length;

  const workerUrl = process.env.WORKER_URL?.trim();
  if (workerUrl) {
    console.log(`  Using WORKER_URL: ${workerUrl}`);
    const healthy = await checkWorkerHealth(`${workerUrl.replace(/\/+$/, '')}${ApiEndpoint.Health}`);
    if (!healthy) {
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: `Worker not reachable at ${workerUrl}`,
      };
      writeJson(schemathesisResultsJsonPath, result);
      console.error('  [FAIL] Worker not reachable at', workerUrl);
      process.exit(1);
    }
  } else {
    const workerResult = await ensureWorker(workerPort);
    if (!workerResult.ok) {
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: workerResult.details ?? 'Worker not available',
      };
      writeJson(schemathesisResultsJsonPath, result);
      console.error('  [FAIL]', workerResult.details ?? 'Worker not available');
      process.exit(1);
    }
  }

  if (!ensureSchemathesisInstalled()) {
    const result = {
      name: 'Schemathesis API Fuzzing',
      status: 'failed',
      exitCode: 1,
      errorType: 'not_installed',
      duration: 0,
      summary: 'Schemathesis not installed - install with: pip install schemathesis',
      installCommand: 'pip install schemathesis',
    };
    writeJson(schemathesisResultsJsonPath, result);
    console.error('  [FAIL] Schemathesis not installed. Install with: pip install schemathesis');
    process.exit(1);
  }

  const runtimeDir = createRuntimeArtifactsDir();
  const schemaPath = path.join(runtimeDir, 'openapi.json');
  const baseUrl = workerUrl ? workerUrl.replace(/\/+$/, '') : workerBaseUrl;
  const runtimeFixtures = createSchemathesisRuntimeFixtures(baseUrl);
  const schemathesisExamplesStoryRuntimePath = path.join(runtimeDir, 'schemathesis.examples.story.ndjson');
  const schemathesisAuthToken = process.env.SCHEMATHESIS_AUTH_TOKEN?.trim() || `${TestTokenPrefix.Test}schemathesis:admin`;
  const schemathesisTimeoutMs = Number(process.env.SCHEMATHESIS_TIMEOUT_MS ?? '1200000');
  const schemathesisRequestTimeoutSeconds = process.env.SCHEMATHESIS_REQUEST_TIMEOUT_SECONDS?.trim() || '30';
  const schemathesisWorkers = process.env.SCHEMATHESIS_WORKERS?.trim() || getDefaultSchemathesisWorkers();
  const schemathesisMaxExamples = process.env.SCHEMATHESIS_MAX_EXAMPLES?.trim() || (process.env.CI ? '50' : '50');
  const timeoutMs = Number.isFinite(schemathesisTimeoutMs) && schemathesisTimeoutMs > 0 ? schemathesisTimeoutMs : 1200000;
  const includeMethod = process.env.TARGET_METHOD?.trim() || undefined;
  const commonRunParams = {
    schemaPath,
    baseUrl,
    runtimeFixtures,
    includePath: includeTarget || undefined,
    includeMethod,
    authToken: schemathesisAuthToken,
    maxExamples: schemathesisMaxExamples,
    workers: schemathesisWorkers,
    requestTimeoutSeconds: schemathesisRequestTimeoutSeconds,
    timeoutMs,
  };

  const writeOverallResult = (result: Record<string, unknown>): void => {
    writeJson(schemathesisResultsJsonPath, result);
  };

  console.log(`  Schemathesis workers: ${schemathesisWorkers} (default: all logical CPUs)`);
  await seedExampleState(baseUrl, schemathesisAuthToken, runtimeFixtures);
  fs.writeFileSync(schemaPath, applyRuntimeOpenApiFixtures(generateOpenApiJson(), runtimeFixtures), 'utf-8');

  if (examplesOnly) {
    console.log('[run-schemathesis] Schemathesis examples only\n');
    console.log('  Step 1: OpenAPI example gap audit');
    if (exampleGapCount > 0) {
      console.log(`  Found ${exampleGapCount} operations with missing examples.`);
    } else {
      console.log('  No OpenAPI example gaps found.');
    }
    console.log('  Step 2: Schemathesis examples run');

    initializeExamplesStoryJournal({
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      storyPath: schemathesisExamplesStoryRuntimePath,
    });

    const examples = await runExamplesPhase({
      ...commonRunParams,
      onOutputChunk: (stream, text) => {
        appendNdjsonEntry(schemathesisExamplesStoryRuntimePath, {
          type: 'schemathesis-output-chunk',
          stream,
          text,
        });
      },
    });

    const examplesSummaryText = buildExamplesSummaryText({
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      run: examples.run,
      reports: {
        junit: examples.reports.junit,
        ndjson: examples.reports.ndjson,
        story: schemathesisExamplesStoryNdjsonPath,
        text: schemathesisExamplesSummaryTxtPath,
      },
    });
    appendExamplesRunJournal({
      storyPath: schemathesisExamplesStoryRuntimePath,
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      run: examples.run,
      reports: {
        junit: examples.reports.junit,
        ndjson: examples.reports.ndjson,
        story: schemathesisExamplesStoryNdjsonPath,
        text: schemathesisExamplesSummaryTxtPath,
      },
    });
    fs.writeFileSync(schemathesisExamplesSummaryTxtPath, examplesSummaryText, 'utf-8');
    console.log(`  🚫 Examples (in ${examples.run.duration.toFixed(2)}s) ✅ ${examples.run.caseSummary.passed} passed ❌ ${examples.run.caseSummary.failed} failed 🚫 ${examples.run.caseSummary.errors} errors ⏭ ${examples.run.caseSummary.skipped} skipped`);
    console.log(`  Full report: ${schemathesisExamplesSummaryTxtPath}`);

    const examplesFailed = examples.run.code !== 0 || examples.run.caseSummary.failed > 0 || examples.run.caseSummary.errors > 0;
    if (examplesFailed) {
      writeOverallResult({
        name: 'Schemathesis API Examples',
        phase: 'examples',
        status: 'failed',
        exitCode: examples.run.code || 1,
        errorType: 'example_failures',
        summary: 'Examples phase failed; fix the example cases before running fuzzing',
        exampleGapCount,
        examples: {
          status: examples.run.code === 0 ? 'completed-with-example-failures' : 'failed',
          testCases: examples.run.junitSummary.testCases ?? examples.run.caseSummary.cases.length,
          failures: examples.run.junitSummary.failures ?? examples.run.caseSummary.failed,
          errors: examples.run.junitSummary.errors ?? examples.run.caseSummary.errors,
          skipped: examples.run.junitSummary.skipped ?? examples.run.caseSummary.skipped,
          reports: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
          },
        },
        reports: {
          examples: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
            story: schemathesisExamplesStoryNdjsonPath,
            text: schemathesisExamplesSummaryTxtPath,
          },
        },
        runtime: {
          liveOutput: examples.run.liveOutput,
          schemaPath,
        },
      });
      console.warn('  [WARN] Examples phase has failures. See schemathesis-examples-results.json, schemathesis-examples.txt, and schemathesis.examples.story.ndjson');
      process.exit(1);
    }

    writeOverallResult({
      name: 'Schemathesis API Examples',
      phase: 'examples',
      status: 'passed',
      exitCode: 0,
      duration: examples.run.duration,
      summary: 'Examples completed',
      exampleGapCount,
      testCases: examples.run.junitSummary.testCases ?? examples.run.caseSummary.cases.length,
      failures: examples.run.junitSummary.failures ?? examples.run.caseSummary.failed,
      errors: examples.run.junitSummary.errors ?? examples.run.caseSummary.errors,
      skipped: examples.run.junitSummary.skipped ?? examples.run.caseSummary.skipped,
      cases: examples.run.caseSummary.cases,
      reports: {
        examples: {
          junit: examples.reports.junit,
          ndjson: examples.reports.ndjson,
          story: schemathesisExamplesStoryNdjsonPath,
          text: schemathesisExamplesSummaryTxtPath,
        },
      },
      runtime: {
        liveOutput: examples.run.liveOutput,
        schemaPath,
      },
    });
    console.log(`  Read first: ${schemathesisExamplesSummaryTxtPath}`);
    console.log(`  Journal: ${schemathesisExamplesStoryNdjsonPath}`);
    console.log(`  Raw Schemathesis NDJSON: ${schemathesisExamplesWorkspaceNdjsonPath}`);
    console.log(`  JUnit XML for CI: ${schemathesisExamplesWorkspaceJunitPath}`);
    console.log(`  Results JSON: ${schemathesisExamplesResultsJsonPath}`);
    if (exampleGapCount > 0) {
      console.log(`  Example gap audit found ${exampleGapCount} operations with missing examples.`);
    }
    console.log(`  [PASS] Schemathesis examples completed in ${examples.run.duration.toFixed(1)}s`);
    process.exit(0);
  }

  if (splitExamplesAndFuzzing) {
    console.log('  Step 1: OpenAPI example gap audit');
    if (exampleGapCount > 0) {
      console.log(`  Found ${exampleGapCount} operations with missing examples.`);
    } else {
      console.log('  No OpenAPI example gaps found.');
    }
    console.log('  Step 2: Schemathesis examples run');

    initializeExamplesStoryJournal({
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      storyPath: schemathesisExamplesStoryRuntimePath,
    });

    const examples = await runExamplesPhase({
      ...commonRunParams,
      onOutputChunk: (stream, text) => {
        appendNdjsonEntry(schemathesisExamplesStoryRuntimePath, {
          type: 'schemathesis-output-chunk',
          stream,
          text,
        });
      },
    });
    appendExamplesRunJournal({
      storyPath: schemathesisExamplesStoryRuntimePath,
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      run: examples.run,
      reports: {
        junit: examples.reports.junit,
        ndjson: examples.reports.ndjson,
        story: schemathesisExamplesStoryNdjsonPath,
        text: schemathesisExamplesSummaryTxtPath,
      },
    });

    fs.writeFileSync(schemathesisExamplesSummaryTxtPath, buildExamplesSummaryText({
      includePath: includeTarget,
      exampleGapRows,
      exampleGapCount,
      run: examples.run,
      reports: {
        junit: examples.reports.junit,
        ndjson: examples.reports.ndjson,
        story: schemathesisExamplesStoryNdjsonPath,
        text: schemathesisExamplesSummaryTxtPath,
      },
    }), 'utf-8');
    copyArtifactToWorkspace(schemathesisExamplesStoryRuntimePath, schemathesisExamplesStoryNdjsonPath);
    console.log(`  🚫 Examples (in ${examples.run.duration.toFixed(2)}s) ✅ ${examples.run.caseSummary.passed} passed ❌ ${examples.run.caseSummary.failed} failed 🚫 ${examples.run.caseSummary.errors} errors ⏭ ${examples.run.caseSummary.skipped} skipped`);
    console.log(`  Full report: ${schemathesisExamplesSummaryTxtPath}`);

    const examplesFailed = examples.run.code !== 0 || examples.run.caseSummary.failed > 0 || examples.run.caseSummary.errors > 0;
    if (examplesFailed) {
      writeOverallResult({
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        exitCode: examples.run.code || 1,
        errorType: 'example_failures',
        summary: 'Examples phase failed; fix the example cases before running fuzzing',
        examples: {
          status: examples.run.code === 0 ? 'completed-with-example-failures' : 'failed',
          testCases: examples.run.junitSummary.testCases ?? examples.run.caseSummary.cases.length,
          failures: examples.run.junitSummary.failures ?? examples.run.caseSummary.failed,
          errors: examples.run.junitSummary.errors ?? examples.run.caseSummary.errors,
          skipped: examples.run.junitSummary.skipped ?? examples.run.caseSummary.skipped,
          reports: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
          },
        },
        reports: {
          examples: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
            story: schemathesisExamplesStoryNdjsonPath,
            text: schemathesisExamplesSummaryTxtPath,
          },
        },
        runtime: {
          liveOutput: examples.run.liveOutput,
          schemaPath,
        },
        exampleGapCount,
      });
      console.warn('  [WARN] Examples phase has failures. See schemathesis-examples-results.json and schemathesis-examples.log');
      process.exit(1);
    }

    console.log('  Examples passed; starting actual fuzzing...\n');
    console.log('  Step 3: Schemathesis fuzzing run');
    const fuzzing = await runFuzzingPhase({
      ...commonRunParams,
      phases: 'fuzzing',
    });
    console.log(`  🚫 Fuzzing (in ${fuzzing.run.duration.toFixed(2)}s) ✅ ${fuzzing.run.caseSummary.passed} passed ❌ ${fuzzing.run.caseSummary.failed} failed 🚫 ${fuzzing.run.caseSummary.errors} errors ⏭ ${fuzzing.run.caseSummary.skipped} skipped`);
    console.log(`  Full report: ${schemathesisExamplesSummaryTxtPath}`);

    const isEncodingError = fuzzing.run.output.includes('UnicodeEncodeError') || fuzzing.run.output.includes('charmap codec');
    if (isEncodingError) {
      writeOverallResult({
        name: 'Schemathesis API Fuzzing',
        status: 'warning',
        exitCode: fuzzing.run.code,
        errorType: 'encoding_error',
        duration: fuzzing.run.duration,
        summary: 'Schemathesis encoding error (Windows console)',
        workaround: 'Set PYTHONIOENCODING=utf-8',
        examples: {
          testCases: examples.run.junitSummary.testCases ?? examples.run.caseSummary.cases.length,
          failures: examples.run.junitSummary.failures ?? examples.run.caseSummary.failed,
          errors: examples.run.junitSummary.errors ?? examples.run.caseSummary.errors,
          skipped: examples.run.junitSummary.skipped ?? examples.run.caseSummary.skipped,
          reports: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
          },
        },
        reports: {
          examples: {
            junit: examples.reports.junit,
            ndjson: examples.reports.ndjson,
            story: schemathesisExamplesStoryNdjsonPath,
            text: schemathesisExamplesSummaryTxtPath,
          },
          fuzzing: {
            junit: fuzzing.reports.junit,
            ndjson: fuzzing.reports.ndjson,
          },
        },
      });
      console.warn('  [WARN] Schemathesis encoding error - see log');
      process.exit(0);
    }

    writeOverallResult({
      name: 'Schemathesis API Fuzzing',
      status: fuzzing.run.code === 0 ? 'passed' : 'failed',
      exitCode: fuzzing.run.code,
      duration: fuzzing.run.duration,
      summary: fuzzing.run.code === 0 ? 'Schemathesis API fuzzing completed' : `Schemathesis exited with code ${fuzzing.run.code}`,
      testCases: fuzzing.run.junitSummary.testCases ?? fuzzing.run.caseSummary.cases.length,
      failures: fuzzing.run.junitSummary.failures ?? fuzzing.run.caseSummary.failed,
      errors: fuzzing.run.junitSummary.errors ?? fuzzing.run.caseSummary.errors,
      skipped: fuzzing.run.junitSummary.skipped ?? fuzzing.run.caseSummary.skipped,
      examples: {
        testCases: examples.run.junitSummary.testCases ?? examples.run.caseSummary.cases.length,
        failures: examples.run.junitSummary.failures ?? examples.run.caseSummary.failed,
        errors: examples.run.junitSummary.errors ?? examples.run.caseSummary.errors,
        skipped: examples.run.junitSummary.skipped ?? examples.run.caseSummary.skipped,
        reports: {
          junit: examples.reports.junit,
          ndjson: examples.reports.ndjson,
        },
      },
      reports: {
        examples: {
          junit: examples.reports.junit,
          ndjson: examples.reports.ndjson,
          story: schemathesisExamplesStoryNdjsonPath,
        },
        fuzzing: {
          junit: fuzzing.reports.junit,
          ndjson: fuzzing.reports.ndjson,
        },
      },
      runtime: {
        liveOutput: fuzzing.run.liveOutput,
        schemaPath,
      },
    });
    console.log(`  Examples read first: ${schemathesisExamplesSummaryTxtPath}`);
    console.log(`  Examples journal: ${schemathesisExamplesStoryNdjsonPath}`);
    console.log(`  Examples raw NDJSON: ${schemathesisExamplesWorkspaceNdjsonPath}`);
    console.log(`  Examples JUnit XML: ${schemathesisExamplesWorkspaceJunitPath}`);
    console.log(`  Examples results JSON: ${schemathesisExamplesResultsJsonPath}`);
    console.log(`  Fuzzing raw NDJSON: ${schemathesisWorkspaceNdjsonPath}`);
    console.log(`  Fuzzing JUnit XML: ${schemathesisWorkspaceJunitPath}`);
    console.log(`  Fuzzing results JSON: ${schemathesisResultsJsonPath}`);
    copyArtifactToWorkspace(schemathesisExamplesStoryRuntimePath, schemathesisExamplesStoryNdjsonPath);

    if (fuzzing.run.code === 0) {
      console.log(`  [PASS] Schemathesis completed in ${fuzzing.run.duration.toFixed(1)}s`);
    } else {
      console.warn(`  [WARN] Schemathesis exited with code ${fuzzing.run.code}`);
    }
    process.exit(fuzzing.run.code === 0 ? 0 : 1);
  }

  const combined = await runFuzzingPhase({
    ...commonRunParams,
    phases: requestedPhases.length > 0 ? requestedPhases.join(',') : 'examples,fuzzing',
  });
  console.log(`  🚫 Schemathesis (in ${combined.run.duration.toFixed(2)}s) ✅ ${combined.run.caseSummary.passed} passed ❌ ${combined.run.caseSummary.failed} failed 🚫 ${combined.run.caseSummary.errors} errors ⏭ ${combined.run.caseSummary.skipped} skipped`);
  console.log(`  Full report: ${schemathesisExamplesSummaryTxtPath}`);

  const isEncodingError = combined.run.output.includes('UnicodeEncodeError') || combined.run.output.includes('charmap codec');
  if (isEncodingError) {
    writeOverallResult({
      name: 'Schemathesis API Fuzzing',
      status: 'warning',
      exitCode: combined.run.code,
      errorType: 'encoding_error',
      duration: combined.run.duration,
      summary: 'Schemathesis encoding error (Windows console)',
      workaround: 'Set PYTHONIOENCODING=utf-8',
      reports: {
        junit: combined.reports.junit,
        ndjson: combined.reports.ndjson,
      },
    });
    console.warn('  [WARN] Schemathesis encoding error - see log');
    process.exit(0);
  }

  writeOverallResult({
    name: 'Schemathesis API Fuzzing',
    status: combined.run.code === 0 ? 'passed' : 'failed',
    exitCode: combined.run.code,
    duration: combined.run.duration,
    summary: combined.run.code === 0 ? 'Schemathesis API fuzzing completed' : `Schemathesis exited with code ${combined.run.code}`,
    testCases: combined.run.junitSummary.testCases ?? combined.run.caseSummary.cases.length,
    failures: combined.run.junitSummary.failures ?? combined.run.caseSummary.failed,
    errors: combined.run.junitSummary.errors ?? combined.run.caseSummary.errors,
    skipped: combined.run.junitSummary.skipped ?? combined.run.caseSummary.skipped,
    reports: {
      junit: combined.reports.junit,
      ndjson: combined.reports.ndjson,
    },
    runtime: {
      liveOutput: combined.run.liveOutput,
      schemaPath,
    },
  });

  if (combined.run.code === 0) {
    console.log(`  [PASS] Schemathesis completed in ${combined.run.duration.toFixed(1)}s`);
  } else {
    console.warn(`  [WARN] Schemathesis exited with code ${combined.run.code}`);
  }
  process.exit(combined.run.code === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  const result = {
    name: 'Schemathesis API Fuzzing',
    status: 'failed',
    exitCode: 1,
    errorType: 'execution_error',
    duration: 0,
    errorMessage: errMsg,
    summary: `Schemathesis failed: ${errMsg}`,
  };
  writeJson(schemathesisResultsJsonPath, result);
  console.error('  [FAIL]', errMsg);
  process.exit(1);
});
