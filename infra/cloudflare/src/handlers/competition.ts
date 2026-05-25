import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { requireAuth } from '@/utils/auth-middleware';
import { validateSchemaBody } from '@/utils/schema-validation';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import {
  HttpContentType,
  HttpHeader,
  HttpMethod,
  HttpStatus,
} from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import {
  CompetitionCheckInResponseSchema,
  CompetitionProgramDetailResponseSchema,
  CompetitionProgramSchema,
  CompetitionProgramsResponseSchema,
  CompetitionRegisterRequestSchema,
  CompetitionRegistrationResponseSchema,
  type CompetitionProgram,
  type CompetitionProgramStatus,
  type CompetitionProgramType,
  type CompetitionProgramsResponse,
} from '@ocentra/endpoint-domain/schemas/competition';
import { buildCompetitionSeedPrograms } from '@/config/competition-programs';

const log = Logger.instance;
log.register(import.meta.url);

type CompetitionFeed = {
  programs: CompetitionProgram[];
  featuredProgramId?: string;
  source: CompetitionProgramsResponse['source'];
  generatedAt: string;
};

const MutatingActions = {
  Register: 'register',
  CheckIn: 'check-in',
} as const;

function json(env: Env, body: unknown, status: number = HttpStatus.Ok, requestOrigin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}

function sortPrograms(programs: CompetitionProgram[]): CompetitionProgram[] {
  return [...programs].sort((a, b) => {
    const aTime = Date.parse(a.lifecycle.startsAt);
    const bTime = Date.parse(b.lifecycle.startsAt);
    return (Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime)
      - (Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime);
  });
}

function normalizeAssetFeed(value: unknown, generatedAt: string): CompetitionFeed | null {
  const candidate = Array.isArray(value)
    ? { programs: value, generatedAt }
    : value && typeof value === 'object'
      ? value as Record<string, unknown>
      : null;
  if (!candidate) return null;
  const programsValue = Array.isArray(candidate.programs) ? candidate.programs : [];
  const programs = programsValue
    .map(program => CompetitionProgramSchema.safeParse(program))
    .filter((result): result is { success: true; data: CompetitionProgram } => result.success)
    .map(result => result.data);
  const payload = {
    programs: sortPrograms(programs),
    featuredProgramId: typeof candidate.featuredProgramId === 'string' ? candidate.featuredProgramId : undefined,
    source: 'asset',
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : generatedAt,
  };
  const parsed = CompetitionProgramsResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

async function loadCompetitionFeed(env: Env): Promise<CompetitionFeed> {
  const generatedAt = new Date().toISOString();
  if (env.ASSETS_BUCKET) {
    try {
      const object = await env.ASSETS_BUCKET.get(BucketPath.CompetitionProgramsIndex);
      if (object) {
        const raw = await object.json().catch(() => null);
        const assetFeed = normalizeAssetFeed(raw, generatedAt);
        if (assetFeed) return assetFeed;
      }
    } catch (error) {
      log.logWarn('Competition asset feed unavailable', getStackTrace(), { error });
    }
  }

  const programs = sortPrograms(buildCompetitionSeedPrograms());
  const featuredProgram = programs.find(program => program.featured) ?? programs[0];
  return CompetitionProgramsResponseSchema.parse({
    programs,
    featuredProgramId: featuredProgram?.programId,
    source: 'seed-fallback',
    generatedAt,
  });
}

function publicPrograms(programs: CompetitionProgram[]): CompetitionProgram[] {
  return programs.filter(program => program.status !== 'draft');
}

function findPublicProgram(feed: CompetitionFeed, programId: string): CompetitionProgram | null {
  return publicPrograms(feed.programs).find(program => program.programId === programId) ?? null;
}

function isClosedStatus(status: CompetitionProgramStatus): boolean {
  return status === 'registration_closed' || status === 'completed' || status === 'cancelled';
}

function isCheckInOpen(program: CompetitionProgram, now = Date.now()): boolean {
  if (program.status === 'check_in' || program.status === 'live') return true;
  const opensAt = program.lifecycle.checkInOpensAt ? Date.parse(program.lifecycle.checkInOpensAt) : NaN;
  const closesAt = program.lifecycle.checkInClosesAt ? Date.parse(program.lifecycle.checkInClosesAt) : NaN;
  return !Number.isNaN(opensAt) && !Number.isNaN(closesAt) && now >= opensAt && now <= closesAt;
}

function filterPrograms(programs: CompetitionProgram[], url: URL): CompetitionProgram[] {
  const typeFilter = url.searchParams.get(QueryParam.Type) as CompetitionProgramType | null;
  const statusFilter = url.searchParams.get(QueryParam.Status) as CompetitionProgramStatus | null;
  const gameIdFilter = url.searchParams.get(QueryParam.GameId);
  return programs.filter(program => {
    if (typeFilter && program.programType !== typeFilter) return false;
    if (statusFilter && program.status !== statusFilter) return false;
    if (gameIdFilter && !program.gameIds.includes(gameIdFilter)) return false;
    return true;
  });
}

function parseProgramPath(path: string): { programId: string; action: string } | null {
  const prefix = ApiEndpoint.Competition.Programs;
  if (!path.startsWith(`${prefix}/`)) return null;
  const parts = path.slice(prefix.length).split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return {
    programId: decodeURIComponent(parts[0] ?? ''),
    action: parts[1] ?? '',
  };
}

export async function handleCompetitionRequest(
  request: Request,
  env: Env,
  path: string,
  requestOrigin?: string,
): Promise<Response> {
  const supportedMethods = [HttpMethod.Get, HttpMethod.Post];
  const methodError = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodError) return methodError;

  const feed = await loadCompetitionFeed(env);
  const programPath = parseProgramPath(path);

  if (request.method === HttpMethod.Get && (path === ApiEndpoint.Competition.Base || path === ApiEndpoint.Competition.Programs)) {
    const url = new URL(request.url);
    const programs = filterPrograms(publicPrograms(feed.programs), url);
    const featuredProgram = programs.find(program => program.programId === feed.featuredProgramId) ?? programs.find(program => program.featured) ?? programs[0];
    return json(env, CompetitionProgramsResponseSchema.parse({
      programs,
      featuredProgramId: featuredProgram?.programId,
      source: feed.source,
      generatedAt: feed.generatedAt,
    }), HttpStatus.Ok, requestOrigin);
  }

  if (request.method === HttpMethod.Get && programPath && !programPath.action) {
    const program = findPublicProgram(feed, programPath.programId);
    if (!program) {
      return json(env, { error: ErrorMessage.NotFound, programId: programPath.programId }, HttpStatus.NotFound, requestOrigin);
    }
    return json(env, CompetitionProgramDetailResponseSchema.parse({
      program,
      source: feed.source,
      generatedAt: feed.generatedAt,
    }), HttpStatus.Ok, requestOrigin);
  }

  if (request.method === HttpMethod.Post && programPath?.action === MutatingActions.Register) {
    const authResult = await requireAuth(request, env, requestOrigin, ErrorMessage.AuthenticationRequired);
    if (authResult instanceof Response) return authResult;
    const validation = await validateSchemaBody(request.clone(), env, CompetitionRegisterRequestSchema);
    if (validation.errorResponse) return validation.errorResponse;
    const program = findPublicProgram(feed, programPath.programId);
    if (!program) {
      return json(env, CompetitionRegistrationResponseSchema.parse({
        programId: programPath.programId,
        registered: false,
        status: 'not_found',
        message: 'Competition program not found.',
      }), HttpStatus.NotFound, requestOrigin);
    }
    if (isClosedStatus(program.status)) {
      return json(env, CompetitionRegistrationResponseSchema.parse({
        programId: program.programId,
        registered: false,
        status: 'closed',
        message: 'Registration is closed for this competition.',
      }), HttpStatus.Conflict, requestOrigin);
    }
    if (program.entry.mode === 'ticket' || program.entry.mode === 'pass') {
      return json(env, CompetitionRegistrationResponseSchema.parse({
        programId: program.programId,
        registered: false,
        status: 'requires_purchase',
        productId: program.entry.productId,
        shopPath: program.entry.shopPath,
        message: `${program.entry.requirementLabel ?? 'Access'} is required before registration.`,
      }), HttpStatus.Ok, requestOrigin);
    }
    return json(env, CompetitionRegistrationResponseSchema.parse({
      programId: program.programId,
      registered: true,
      status: 'registered',
      message: 'Registration is recorded for this session.',
    }), HttpStatus.Ok, requestOrigin);
  }

  if (request.method === HttpMethod.Post && programPath?.action === MutatingActions.CheckIn) {
    const authResult = await requireAuth(request, env, requestOrigin, ErrorMessage.AuthenticationRequired);
    if (authResult instanceof Response) return authResult;
    const program = findPublicProgram(feed, programPath.programId);
    if (!program) {
      return json(env, CompetitionCheckInResponseSchema.parse({
        programId: programPath.programId,
        checkedIn: false,
        status: 'not_found',
        message: 'Competition program not found.',
      }), HttpStatus.NotFound, requestOrigin);
    }
    if (program.status === 'completed' || program.status === 'cancelled') {
      return json(env, CompetitionCheckInResponseSchema.parse({
        programId: program.programId,
        checkedIn: false,
        status: 'closed',
        message: 'Check-in is closed for this competition.',
      }), HttpStatus.Conflict, requestOrigin);
    }
    if (!isCheckInOpen(program)) {
      return json(env, CompetitionCheckInResponseSchema.parse({
        programId: program.programId,
        checkedIn: false,
        status: 'not_open',
        lobbyPath: program.routes.lobbyPath,
        message: 'Check-in is not open yet.',
      }), HttpStatus.Ok, requestOrigin);
    }
    return json(env, CompetitionCheckInResponseSchema.parse({
      programId: program.programId,
      checkedIn: true,
      status: 'checked_in',
      lobbyPath: program.routes.lobbyPath,
      message: 'Check-in is open. Continue to the lobby.',
    }), HttpStatus.Ok, requestOrigin);
  }

  return json(env, { error: ErrorMessage.NotFound }, HttpStatus.NotFound, requestOrigin);
}
