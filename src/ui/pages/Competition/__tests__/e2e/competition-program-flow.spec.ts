import { expect, test, type Page } from '@playwright/test';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  HttpContentType,
  HttpHeader,
  HttpStatus,
} from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import {
  PublicRouteKey,
  PublicRoutePath,
  buildPublicGameLobbyPath,
} from '@ocentra/endpoint-domain/constants/public-routes';
import type {
  CompetitionProgram,
  CompetitionProgramsResponse,
} from '@ocentra/endpoint-domain/schemas/competition';

const ClaimGameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
const GeneratedAt = '2026-05-24T00:00:00.000Z';
const TicketProgramId = 'pw-ticket-open';
const LiveProgramId = 'pw-live-lobby';
const TicketShopPath = `${PublicRoutePath[PublicRouteKey.Shop]}?program=${TicketProgramId}`;
const ClaimLobbyPath = buildPublicGameLobbyPath(ClaimGameId);

const TicketProgram: CompetitionProgram = {
  programId: TicketProgramId,
  programType: 'event',
  title: 'Playwright Ticket Open',
  subtitle: 'Ticketed event validation',
  description: 'Playwright-only authored event fixture.',
  status: 'registration_open',
  featured: true,
  gameIds: [ClaimGameId],
  tags: ['playwright'],
  lifecycle: {
    startsAt: '2026-06-01T18:00:00.000Z',
    registrationOpensAt: '2026-05-25T12:00:00.000Z',
    registrationClosesAt: '2026-06-01T17:00:00.000Z',
  },
  entry: {
    mode: 'ticket',
    productId: 'ticket-pw-ticket-open',
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

const LiveProgram: CompetitionProgram = {
  programId: LiveProgramId,
  programType: 'tournament',
  title: 'Playwright Live Lobby Cup',
  subtitle: 'Live tournament validation',
  description: 'Playwright-only authored tournament fixture.',
  status: 'live',
  featured: true,
  gameIds: [ClaimGameId],
  tags: ['playwright'],
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

async function openCompetition(page: Page) {
  await page.goto(PublicRoutePath[PublicRouteKey.Competition]);
  await expect(page.locator('.screen-loading-fallback')).toHaveCount(0, { timeout: 60000 });
  await expect(page.getByRole('img', { name: 'Competition events and tournaments page layout' })).toBeVisible({ timeout: 30000 });
}

function filterPrograms(programs: CompetitionProgram[], url: URL): CompetitionProgram[] {
  const type = url.searchParams.get(QueryParam.Type);
  const status = url.searchParams.get(QueryParam.Status);
  const gameId = url.searchParams.get(QueryParam.GameId);
  return programs.filter(program => {
    if (type && program.programType !== type) return false;
    if (status && program.status !== status) return false;
    if (gameId && !program.gameIds.includes(gameId)) return false;
    return true;
  });
}

async function routeAuthoredCompetitionPrograms(page: Page, programs: CompetitionProgram[]) {
  await page.route(`**${ApiEndpoint.Competition.Programs}**`, async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    const url = new URL(request.url());
    if (url.pathname === ApiEndpoint.Competition.Programs) {
      const visiblePrograms = filterPrograms(programs, url);
      const featuredProgram = visiblePrograms.find(program => program.featured) ?? visiblePrograms[0];
      const body: CompetitionProgramsResponse = {
        programs: visiblePrograms,
        featuredProgramId: featuredProgram?.programId,
        source: 'asset',
        generatedAt: GeneratedAt,
      };
      await route.fulfill({
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify(body),
      });
      return;
    }

    const programId = decodeURIComponent(url.pathname.slice(`${ApiEndpoint.Competition.Programs}/`.length));
    const program = programs.find(candidate => candidate.programId === programId);
    if (!program) {
      await route.fulfill({
        status: HttpStatus.NotFound,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({ error: 'Not found', programId }),
      });
      return;
    }

    await route.fulfill({
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ program, source: 'asset', generatedAt: GeneratedAt }),
    });
  });
}

test.describe('Competition program flow', () => {
  test('public beta competition page does not show fake programs', async ({ page }) => {
    await openCompetition(page);

    await expect(page.getByText('No tournament registration is open right now').first()).toBeVisible();
    await expect(page.getByText('No event registration is open right now').first()).toBeVisible();
    await expect(page.getByText('Claim Weekly Open')).toHaveCount(0);
    await expect(page.getByText('Season Ladder Cup')).toHaveCount(0);
  });

  test('authored ticketed program opens the shop route', async ({ page }) => {
    await routeAuthoredCompetitionPrograms(page, [TicketProgram]);
    await openCompetition(page);

    await expect(page.getByText(TicketProgram.title).first()).toBeVisible();
    await page.getByRole('button', { name: `View Program ${TicketProgram.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'View Program', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${TicketShopPath.replace('?', '\\?')}$`), { timeout: 15000 });
  });

  test('authored live program opens the game lobby route', async ({ page }) => {
    await routeAuthoredCompetitionPrograms(page, [LiveProgram]);
    await openCompetition(page);

    await expect(page.getByText(LiveProgram.title).first()).toBeVisible();
    await page.getByRole('button', { name: `View Program ${LiveProgram.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'View Program', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${ClaimLobbyPath}$`), { timeout: 15000 });
  });
});
