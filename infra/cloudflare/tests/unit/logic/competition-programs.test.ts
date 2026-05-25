import { afterAll, vi } from 'vitest';
import { describe, expect, extractName, it, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import type { Env } from '@/constants/env';
import { handleCompetitionRequest } from '@/handlers/competition';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import {
  HttpContentType,
  HttpHeader,
  HttpMethod,
  HttpStatus,
} from '@ocentra/endpoint-domain/constants/http';
import { QueryParam, QueryValue } from '@ocentra/endpoint-domain/constants/query';
import {
  PublicRouteKey,
  PublicRoutePath,
  buildPublicGameLobbyPath,
} from '@ocentra/endpoint-domain/constants/public-routes';
import type {
  CompetitionCheckInResponse,
  CompetitionProgram,
  CompetitionProgramDetailResponse,
  CompetitionProgramsResponse,
  CompetitionRegistrationResponse,
} from '@ocentra/endpoint-domain/schemas/competition';

const ClaimGameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
const GeneratedAt = '2026-05-24T00:00:00.000Z';
const TicketProgramId = 'test-ticket-open';
const LiveProgramId = 'test-live-lobby';
const DraftProgramId = 'test-draft-hidden';
const TicketProductId = 'ticket-test-ticket-open';
const TicketShopPath = `${PublicRoutePath[PublicRouteKey.Shop]}?program=${TicketProgramId}`;
const ClaimLobbyPath = buildPublicGameLobbyPath(ClaimGameId);

const TicketProgram: CompetitionProgram = {
  programId: TicketProgramId,
  programType: 'event',
  title: 'Test Ticket Open',
  subtitle: 'Ticketed event fixture',
  description: 'Authored event fixture used only by competition API tests.',
  status: 'registration_open',
  featured: true,
  gameIds: [ClaimGameId],
  tags: ['test'],
  lifecycle: {
    startsAt: '2026-06-01T18:00:00.000Z',
    registrationOpensAt: '2026-05-25T12:00:00.000Z',
    registrationClosesAt: '2026-06-01T17:00:00.000Z',
  },
  entry: {
    mode: 'ticket',
    productId: TicketProductId,
    entitlementKind: 'event_ticket',
    priceLabel: '$5 ticket',
    shopPath: TicketShopPath,
    requirementLabel: 'Event ticket',
  },
  rewards: [{ title: 'Winner Badge', detail: 'Fixture badge reward', place: 1 }],
  stats: { registered: 4, capacity: 32, prizePoolLabel: 'Badge rewards' },
  routes: {
    detailPath: `/events/${TicketProgramId}`,
    lobbyPath: ClaimLobbyPath,
    shopPath: TicketShopPath,
  },
};

const LiveTournamentProgram: CompetitionProgram = {
  programId: LiveProgramId,
  programType: 'tournament',
  title: 'Test Live Lobby Cup',
  subtitle: 'Live lobby fixture',
  description: 'Authored tournament fixture used only by competition API tests.',
  status: 'live',
  featured: false,
  gameIds: [ClaimGameId],
  tags: ['test'],
  lifecycle: {
    startsAt: '2026-06-02T18:00:00.000Z',
    checkInOpensAt: '2026-06-02T17:30:00.000Z',
    checkInClosesAt: '2026-06-02T18:15:00.000Z',
  },
  entry: {
    mode: 'free',
    requirementLabel: 'Free registration',
  },
  rewards: [],
  stats: { registered: 8, capacity: 16, liveRooms: 1 },
  routes: {
    detailPath: `/tournaments/${LiveProgramId}`,
    lobbyPath: ClaimLobbyPath,
  },
  tournament: {
    format: 'single_elimination',
    teamSize: 1,
    capacity: 16,
    seedMethod: 'rating',
    stages: [{ stageId: 'final', title: 'Final', type: 'final', status: 'live' }],
    bracket: [{
      matchId: 'match-final',
      roundId: 'final',
      label: 'Final',
      status: 'live',
      roomId: 'room-final',
    }],
  },
};

const DraftProgram: CompetitionProgram = {
  ...TicketProgram,
  programId: DraftProgramId,
  title: 'Hidden Draft Program',
  status: 'draft',
  featured: true,
};

function createJsonObject(value: unknown) {
  return {
    json: vi.fn(async () => value),
  };
}

function createEnv(feed: unknown): Env {
  return {
    ENVIRONMENT: Environment.Development,
    DISABLE_AUTH: QueryValue.True,
    ASSETS_BUCKET: {
      get: vi.fn(async (key: string) => key === BucketPath.CompetitionProgramsIndex ? createJsonObject(feed) : null),
    },
  } as unknown as Env;
}

async function sendCompetitionRequest(env: Env, path: string, method: HttpMethod = HttpMethod.Get): Promise<Response> {
  const request = new Request(`https://worker.test${path}`, {
    method,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: method === HttpMethod.Get ? undefined : JSON.stringify({}),
  });
  const requestPath = new URL(request.url).pathname;
  return await handleCompetitionRequest(request, env, requestPath);
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('Competition asset feed: empty authored feed stays empty'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [] });
    const response = await sendCompetitionRequest(env, ApiEndpoint.Competition.Programs);
    const body = await response.json() as CompetitionProgramsResponse;

    expect(response.status).toBe(HttpStatus.Ok);
    expect(body.source).toBe('asset');
    expect(body.programs).toEqual([]);
    expect(body.featuredProgramId).toBeUndefined();
  });

  it(testName('Competition asset feed: authored tournaments filter by type and game'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [TicketProgram, LiveTournamentProgram] });
    const response = await sendCompetitionRequest(
      env,
      `${ApiEndpoint.Competition.Programs}?${QueryParam.Type}=tournament&${QueryParam.GameId}=${encodeURIComponent(ClaimGameId)}`
    );
    const body = await response.json() as CompetitionProgramsResponse;

    expect(response.status).toBe(HttpStatus.Ok);
    expect(body.source).toBe('asset');
    expect(body.programs.map(program => program.programId)).toEqual([LiveProgramId]);
    expect(body.programs[0]?.routes.lobbyPath).toBe(ClaimLobbyPath);
  });

  it(testName('Competition asset feed: public endpoints hide draft programs'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [DraftProgram, TicketProgram] });
    const listResponse = await sendCompetitionRequest(env, ApiEndpoint.Competition.Programs);
    const listBody = await listResponse.json() as CompetitionProgramsResponse;
    const detailResponse = await sendCompetitionRequest(env, ApiEndpoint.Competition.ProgramById(DraftProgramId));

    expect(listResponse.status).toBe(HttpStatus.Ok);
    expect(listBody.programs.map(program => program.programId)).toEqual([TicketProgramId]);
    expect(listBody.featuredProgramId).toBe(TicketProgramId);
    expect(detailResponse.status).toBe(HttpStatus.NotFound);
  });

  it(testName('Competition program detail: returns authored shop and lobby routes'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [TicketProgram, LiveTournamentProgram] });
    const response = await sendCompetitionRequest(env, ApiEndpoint.Competition.ProgramById(TicketProgramId));
    const body = await response.json() as CompetitionProgramDetailResponse;

    expect(response.status).toBe(HttpStatus.Ok);
    expect(body.program.programId).toBe(TicketProgramId);
    expect(body.program.entry.productId).toBe(TicketProductId);
    expect(body.program.routes.shopPath).toBe(TicketShopPath);
    expect(body.program.routes.lobbyPath).toBe(ClaimLobbyPath);
  });

  it(testName('Competition register: ticketed program points to shop access'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [TicketProgram] });
    const response = await sendCompetitionRequest(env, ApiEndpoint.Competition.Register(TicketProgramId), HttpMethod.Post);
    const body = await response.json() as CompetitionRegistrationResponse;

    expect(response.status).toBe(HttpStatus.Ok);
    expect(body.registered).toBe(false);
    expect(body.status).toBe('requires_purchase');
    expect(body.productId).toBe(TicketProductId);
    expect(body.shopPath).toBe(TicketShopPath);
  });

  it(testName('Competition check-in: live program points to game lobby'), async () => {
    const env = createEnv({ generatedAt: GeneratedAt, programs: [LiveTournamentProgram] });
    const response = await sendCompetitionRequest(env, ApiEndpoint.Competition.CheckIn(LiveProgramId), HttpMethod.Post);
    const body = await response.json() as CompetitionCheckInResponse;

    expect(response.status).toBe(HttpStatus.Ok);
    expect(body.checkedIn).toBe(true);
    expect(body.status).toBe('checked_in');
    expect(body.lobbyPath).toBe(ClaimLobbyPath);
  });
});
