#!/usr/bin/env node

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  PublicRouteKey,
  PublicRoutePath,
  buildPublicGameLeaderboardPath,
  buildPublicGameLobbyPath,
  buildPublicGameMatchmakingPath,
  buildPublicGamePath,
  buildPublicRulesPath,
  buildPublicTournamentDetailPath,
} from '@ocentra/endpoint-domain/constants/public-routes';

interface RouteProbe {
  name: string;
  path: string;
  minTextLength?: number;
  timeoutMs?: number;
}

interface BrowserMessage {
  type: string;
  text: string;
}

interface RouteProbeResult {
  name: string;
  path: string;
  status: number;
  title: string;
  textLength: number;
  sample: string;
  consoleMessages: BrowserMessage[];
  pageErrors: string[];
  failedRequests: string[];
}

interface NetworkStats {
  catalogIndexRequests: number;
  catalogGameRequests: number;
  downloadUrlRequests: number;
  workerAssetByteRequests: string[];
}

interface CacheCheckResult {
  baseUrl: string;
  firstCatalog: NetworkStats;
  selectedGame: NetworkStats;
  returnCatalog: NetworkStats;
  secondReturnShowedLoadingGames: boolean;
  usedSpaSelectedGameNavigation: boolean;
  usedSpaReturnNavigation: boolean;
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';
const DEFAULT_ROUTE_TIMEOUT_MS = 60_000;
const CARD_GAMES_ROUTE_TIMEOUT_MS = 90_000;
const DEFAULT_MIN_TEXT_LENGTH = 120;
const CARD_GAMES_MIN_TEXT_LENGTH = 1_000;
const CLAIM_GAME_ID = 'claim';
const BRISCOLA_GAME_ID = 'briscola';
const THREE_CARD_BRAG_GAME_ID = 'three-card-brag';
const TOURNAMENT_ID = 'may-2026';
const IMPORTANT_CONSOLE_TYPES = new Set(['error', 'warning']);
const ASSET_BYTE_ENDPOINT_PREFIX = `${ApiEndpoint.Assets.Base}/`;
const CATALOG_GAME_SLICE_PREFIX = ApiEndpoint.Slices.CatalogGame('');
const BROWSER_HARNESS_CONSOLE_PATTERNS = [
  'GroupMarkerNotSet(crbug.com/242999)',
  'Automatic fallback to software WebGL has been deprecated',
  'GL Driver Message',
  'GPU stall due to ReadPixels',
];

const ROUTE_MATRIX: RouteProbe[] = [
  { name: 'home', path: PublicRoutePath[PublicRouteKey.Home] },
  { name: 'games catalog', path: PublicRoutePath[PublicRouteKey.GamesCatalog] },
  {
    name: 'card games catalog',
    path: PublicRoutePath[PublicRouteKey.CardGamesCatalog],
    minTextLength: CARD_GAMES_MIN_TEXT_LENGTH,
    timeoutMs: CARD_GAMES_ROUTE_TIMEOUT_MS,
  },
  {
    name: 'legacy card games catalog',
    path: PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer],
    minTextLength: CARD_GAMES_MIN_TEXT_LENGTH,
    timeoutMs: CARD_GAMES_ROUTE_TIMEOUT_MS,
  },
  { name: 'selected game claim', path: buildPublicGamePath(CLAIM_GAME_ID), timeoutMs: 60_000 },
  { name: 'selected game briscola', path: buildPublicGamePath(BRISCOLA_GAME_ID), timeoutMs: 60_000 },
  { name: 'selected game three card brag', path: buildPublicGamePath(THREE_CARD_BRAG_GAME_ID), timeoutMs: 60_000 },
  { name: 'rules claim', path: buildPublicRulesPath(CLAIM_GAME_ID), timeoutMs: 60_000 },
  { name: 'shop', path: PublicRoutePath[PublicRouteKey.Shop] },
  { name: 'social', path: PublicRoutePath[PublicRouteKey.Social] },
  { name: 'player hub', path: PublicRoutePath[PublicRouteKey.PlayerHub] },
  { name: 'settings', path: PublicRoutePath[PublicRouteKey.Settings] },
  { name: 'competition', path: PublicRoutePath[PublicRouteKey.Competition] },
  { name: 'tournaments', path: PublicRoutePath[PublicRouteKey.Tournaments] },
  { name: 'tournament detail', path: buildPublicTournamentDetailPath(TOURNAMENT_ID) },
  { name: 'leaderboard', path: PublicRoutePath[PublicRouteKey.Leaderboard] },
  { name: 'ai benchmark leaderboard', path: PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard] },
  { name: 'game leaderboard claim', path: buildPublicGameLeaderboardPath(CLAIM_GAME_ID) },
  { name: 'lobby', path: PublicRoutePath[PublicRouteKey.Lobby] },
  { name: 'game lobby claim', path: buildPublicGameLobbyPath(CLAIM_GAME_ID) },
  { name: 'matchmaking', path: PublicRoutePath[PublicRouteKey.Matchmaking] },
  { name: 'game matchmaking claim', path: buildPublicGameMatchmakingPath(CLAIM_GAME_ID) },
  { name: 'admin', path: PublicRoutePath[PublicRouteKey.Admin] },
  { name: 'admin users', path: PublicRoutePath[PublicRouteKey.AdminUsers] },
];

function argValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  if (index >= 0) {
    return args[index + 1];
  }
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBrowserHarnessConsoleNoise(text: string): boolean {
  return BROWSER_HARNESS_CONSOLE_PATTERNS.some((pattern) => text.includes(pattern));
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function joinUrl(baseUrl: string, pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isOnlyLoadingText(value: string): boolean {
  return /^(loading|loading games|loading game|loading admin|loading logs)(\.{0,3})?$/i.test(normalizeText(value));
}

function hasVisibleLoadingText(value: string): boolean {
  return /\bLoading(?: games| game| admin| logs)?\.{0,3}\b/i.test(value);
}

function isAssetMetadataEndpoint(pathname: string): boolean {
  if (!pathname.startsWith(ASSET_BYTE_ENDPOINT_PREFIX)) {
    return false;
  }
  const rest = pathname.slice(ASSET_BYTE_ENDPOINT_PREFIX.length);
  const firstSegment = rest.split('/').filter(Boolean)[0] ?? '';
  return !firstSegment || ApiEndpoint.Assets.ExcludeSegments.includes(firstSegment);
}

function isWorkerAssetByteEndpoint(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith(ASSET_BYTE_ENDPOINT_PREFIX) && !isAssetMetadataEndpoint(pathname);
  } catch {
    return false;
  }
}

function emptyNetworkStats(): NetworkStats {
  return {
    catalogIndexRequests: 0,
    catalogGameRequests: 0,
    downloadUrlRequests: 0,
    workerAssetByteRequests: [],
  };
}

function addNetworkRequest(stats: NetworkStats, url: string): void {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return;
  }

  if (pathname === ApiEndpoint.Slices.CatalogIndex) {
    stats.catalogIndexRequests += 1;
  }
  if (pathname.startsWith(CATALOG_GAME_SLICE_PREFIX)) {
    stats.catalogGameRequests += 1;
  }
  if (pathname === ApiEndpoint.Assets.DownloadUrl) {
    stats.downloadUrlRequests += 1;
  }
  if (isWorkerAssetByteEndpoint(url)) {
    stats.workerAssetByteRequests.push(url);
  }
}

async function rootText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const root = globalThis.document.querySelector('#root');
    const visibleText = root instanceof globalThis.HTMLElement ? root.innerText : globalThis.document.body.innerText;
    const fallbackText = root?.textContent ?? globalThis.document.body.textContent ?? '';
    return visibleText?.trim() ? visibleText : fallbackText;
  });
}

async function waitForRouteBody(page: Page, route: RouteProbe): Promise<string> {
  const timeoutMs = route.timeoutMs ?? DEFAULT_ROUTE_TIMEOUT_MS;
  const minTextLength = route.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH;
  await page.waitForFunction(
    ({ minLength }) => {
      const root = globalThis.document.querySelector('#root');
      const visibleText = root instanceof globalThis.HTMLElement ? root.innerText : globalThis.document.body.innerText;
      const fallbackText = root?.textContent ?? globalThis.document.body.textContent ?? '';
      const text = visibleText?.trim() ? visibleText : fallbackText;
      const normalized = text.replace(/\s+/g, ' ').trim();
      return normalized.length >= minLength && !/^(loading|loading games|loading game|loading admin|loading logs)(\.{0,3})?$/i.test(normalized);
    },
    { minLength: minTextLength },
    { timeout: timeoutMs }
  );
  return await rootText(page);
}

async function probeRoute(context: BrowserContext, baseUrl: string, route: RouteProbe): Promise<RouteProbeResult> {
  const page = await context.newPage();
  const consoleMessages: BrowserMessage[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (IMPORTANT_CONSOLE_TYPES.has(message.type()) && !isBrowserHarnessConsoleNoise(text)) {
      consoleMessages.push({ type: message.type(), text });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'request failed';
    if (request.resourceType() !== 'image') {
      failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
    }
  });

  try {
    const response = await page.goto(joinUrl(baseUrl, route.path), {
      waitUntil: 'domcontentloaded',
      timeout: route.timeoutMs ?? DEFAULT_ROUTE_TIMEOUT_MS,
    });
    await page.waitForLoadState('networkidle', { timeout: 7_500 }).catch(() => undefined);
    const text = await waitForRouteBody(page, route);
    const normalized = normalizeText(text);
    return {
      name: route.name,
      path: route.path,
      status: response?.status() ?? 0,
      title: await page.title(),
      textLength: normalized.length,
      sample: normalized.slice(0, 220),
      consoleMessages,
      pageErrors,
      failedRequests,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${route.path} probe failed: ${message}`);
  } finally {
    await page.close().catch(() => undefined);
  }
}

function isRetriableProbeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('page.goto: Timeout') || message.includes('page.waitForFunction: Timeout') || message.includes('net::ERR_');
}

function isRetriableRouteResult(result: RouteProbeResult): boolean {
  return result.failedRequests.some((request) => request.includes('/assets/') && (request.includes('net::ERR_ABORTED') || request.includes('net::ERR_CONNECTION'))) ||
    result.consoleMessages.some((message) => message.text.includes('Failed to load resource: the server responded with a status of 500'));
}

function assertRouteResult(label: string, result: RouteProbeResult): void {
  const errors: string[] = [];
  if (result.status !== 200) {
    errors.push(`HTTP ${result.status}`);
  }
  if (!result.title.trim()) {
    errors.push('empty title');
  }
  if (result.textLength < DEFAULT_MIN_TEXT_LENGTH) {
    errors.push(`tiny body (${result.textLength} chars)`);
  }
  if (isOnlyLoadingText(result.sample) || hasVisibleLoadingText(result.sample)) {
    errors.push('visible loading text remained');
  }
  if (result.consoleMessages.length > 0) {
    errors.push(`console messages: ${result.consoleMessages.map((message) => `${message.type}: ${message.text}`).join(' | ')}`);
  }
  if (result.pageErrors.length > 0) {
    errors.push(`page errors: ${result.pageErrors.join(' | ')}`);
  }
  if (result.failedRequests.length > 0) {
    errors.push(`failed requests: ${result.failedRequests.join(' | ')}`);
  }
  if (errors.length > 0) {
    throw new Error(`${label} ${result.path} failed: ${errors.join('; ')}`);
  }
}

async function runRouteMatrix(browser: Browser, baseUrl: string, label: string): Promise<RouteProbeResult[]> {
  let context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const results: RouteProbeResult[] = [];
    for (const route of ROUTE_MATRIX) {
      let result: RouteProbeResult;
      let retried = false;
      try {
        result = await probeRoute(context, baseUrl, route);
      } catch (error) {
        if (!isRetriableProbeError(error)) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[route-matrix] retrying ${route.path} after navigation failure: ${message.split('\n')[0]}`);
        retried = true;
        await context.close().catch(() => undefined);
        await delay(1_000);
        context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        result = await probeRoute(context, baseUrl, route);
      }
      if (!retried && isRetriableRouteResult(result)) {
        console.log(`[route-matrix] retrying ${route.path} after transient static asset failure`);
        await context.close().catch(() => undefined);
        await delay(1_000);
        context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        result = await probeRoute(context, baseUrl, route);
      }
      assertRouteResult(label, result);
      results.push(result);
      console.log(`[route-matrix] ${label} ${route.path}: status=${result.status} chars=${result.textLength} title="${result.title}"`);
    }
    return results;
  } finally {
    await context.close().catch(() => undefined);
  }
}

function compareRouteResults(localResults: RouteProbeResult[], remoteResults: RouteProbeResult[]): void {
  const remoteByPath = new Map(remoteResults.map((result) => [result.path, result]));
  const titleMismatches: string[] = [];

  for (const local of localResults) {
    const remote = remoteByPath.get(local.path);
    if (!remote) {
      titleMismatches.push(`${local.path}: missing remote result`);
      continue;
    }
    if (local.title !== remote.title) {
      titleMismatches.push(`${local.path}: local="${local.title}" remote="${remote.title}"`);
    }
  }

  if (titleMismatches.length > 0) {
    throw new Error(`Route title parity failed: ${titleMismatches.join(' | ')}`);
  }
}

function networkStatsSummary(stats: NetworkStats): string {
  return [
    `catalogIndex=${stats.catalogIndexRequests}`,
    `catalogGame=${stats.catalogGameRequests}`,
    `downloadUrl=${stats.downloadUrlRequests}`,
    `workerAssetBytes=${stats.workerAssetByteRequests.length}`,
  ].join(' ');
}

async function clickFirstAvailable(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() > 0) {
      await locator.click({ timeout: 10_000 });
      return true;
    }
  }
  return false;
}

async function clickVisibleCenterFirstAvailable(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() === 0) {
      continue;
    }
    await locator.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const box = await locator.boundingBox().catch(() => null);
    if (!box) {
      continue;
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return true;
  }
  return false;
}

async function waitForSelectedClaimRoute(page: Page): Promise<void> {
  await page.waitForFunction(
    ({ pathPrefix }) => globalThis.location.pathname.startsWith(pathPrefix),
    { pathPrefix: buildPublicGamePath(CLAIM_GAME_ID) },
    { timeout: 60_000 }
  );
}

async function openClaimGameFromCatalog(page: Page): Promise<boolean> {
  await page.locator('.games-catalog-svg-showcase').waitFor({ state: 'attached', timeout: CARD_GAMES_ROUTE_TIMEOUT_MS }).catch(() => undefined);

  const searchDialog = page.waitForEvent('dialog', { timeout: 5_000 })
    .then((dialog) => dialog.accept('Claim'))
    .catch(() => undefined);
  const searchedClaim = await clickVisibleCenterFirstAvailable(page, [
    'g[role="button"][aria-label="Search games"]',
    '[role="button"][aria-label="Search games"]',
  ]);
  if (searchedClaim) {
    await searchDialog;
    await page.waitForFunction(
      () => [...globalThis.document.querySelectorAll('[aria-label]')].some((element) => element.getAttribute('aria-label') === 'Select CLAIM' || element.getAttribute('aria-label') === 'Select Claim'),
      undefined,
      { timeout: 10_000 }
    ).catch(() => undefined);
  }

  const selectedClaim = await clickVisibleCenterFirstAvailable(page, [
    'g[role="button"][aria-label="Select CLAIM"]',
    'g[role="button"][aria-label="Select Claim"]',
  ]);
  if (!selectedClaim) {
    return false;
  }

  await page.locator('#games-catalog-svg-detail-overlay').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  return clickVisibleCenterFirstAvailable(page, [
    'g[role="button"][aria-label="Game Page"]',
    '[role="button"][aria-label="Game Page"]',
  ]);
}

async function waitForCatalogReady(page: Page): Promise<void> {
  await waitForRouteBody(page, {
    name: 'card games catalog cache check',
    path: PublicRoutePath[PublicRouteKey.CardGamesCatalog],
    minTextLength: CARD_GAMES_MIN_TEXT_LENGTH,
    timeoutMs: CARD_GAMES_ROUTE_TIMEOUT_MS,
  });
  await page.waitForFunction(
    ({ minLength }) => {
      const root = globalThis.document.querySelector('#root');
      const visibleText = root instanceof globalThis.HTMLElement ? root.innerText : globalThis.document.body.innerText;
      const normalized = visibleText.replace(/\s+/g, ' ').trim();
      return Boolean(globalThis.document.querySelector('.games-catalog-svg-showcase')) && normalized.length >= minLength && !/Loading games/i.test(normalized);
    },
    { minLength: CARD_GAMES_MIN_TEXT_LENGTH },
    { timeout: CARD_GAMES_ROUTE_TIMEOUT_MS }
  );
}

async function runCatalogCacheCheck(browser: Browser, baseUrl: string, enforceProductionBoundary: boolean): Promise<CacheCheckResult> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const statsByPhase: Record<'firstCatalog' | 'selectedGame' | 'returnCatalog', NetworkStats> = {
    firstCatalog: emptyNetworkStats(),
    selectedGame: emptyNetworkStats(),
    returnCatalog: emptyNetworkStats(),
  };
  let phase: keyof typeof statsByPhase = 'firstCatalog';
  page.on('request', (request) => addNetworkRequest(statsByPhase[phase], request.url()));

  try {
    await page.goto(joinUrl(baseUrl, PublicRoutePath[PublicRouteKey.CardGamesCatalog]), {
      waitUntil: 'domcontentloaded',
      timeout: CARD_GAMES_ROUTE_TIMEOUT_MS,
    });
    await waitForCatalogReady(page);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(2_000);

    phase = 'selectedGame';
    let usedSpaSelectedGameNavigation = await openClaimGameFromCatalog(page);
    if (!usedSpaSelectedGameNavigation) {
      usedSpaSelectedGameNavigation = await clickFirstAvailable(page, [
        `a[href="${buildPublicGamePath(CLAIM_GAME_ID)}"]`,
        `a[href$="${buildPublicGamePath(CLAIM_GAME_ID)}"]`,
      ]);
    }
    if (!usedSpaSelectedGameNavigation) {
      await page.goto(joinUrl(baseUrl, buildPublicGamePath(CLAIM_GAME_ID)), {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
    }
    await waitForSelectedClaimRoute(page);
    await waitForRouteBody(page, {
      name: 'selected game cache transition',
      path: buildPublicGamePath(CLAIM_GAME_ID),
      timeoutMs: 60_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);

    phase = 'returnCatalog';
    let usedSpaReturnNavigation = false;
    try {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: CARD_GAMES_ROUTE_TIMEOUT_MS });
      await page.waitForFunction(
        ({ path }) => globalThis.location.pathname === path,
        { path: PublicRoutePath[PublicRouteKey.CardGamesCatalog] },
        { timeout: CARD_GAMES_ROUTE_TIMEOUT_MS }
      );
      usedSpaReturnNavigation = true;
    } catch {
      await page.goto(joinUrl(baseUrl, PublicRoutePath[PublicRouteKey.CardGamesCatalog]), {
        waitUntil: 'domcontentloaded',
        timeout: CARD_GAMES_ROUTE_TIMEOUT_MS,
      });
    }
    await page.waitForTimeout(250);
    const secondReturnShowedLoadingGames = /Loading games/i.test(await rootText(page));
    await waitForCatalogReady(page);
    await page.waitForTimeout(1_000);

    const result = {
      baseUrl,
      firstCatalog: statsByPhase.firstCatalog,
      selectedGame: statsByPhase.selectedGame,
      returnCatalog: statsByPhase.returnCatalog,
      secondReturnShowedLoadingGames,
      usedSpaSelectedGameNavigation,
      usedSpaReturnNavigation,
    };

    console.log(`[route-matrix] cache ${baseUrl} first: ${networkStatsSummary(result.firstCatalog)}`);
    console.log(`[route-matrix] cache ${baseUrl} selected: ${networkStatsSummary(result.selectedGame)}`);
    console.log(`[route-matrix] cache ${baseUrl} return: ${networkStatsSummary(result.returnCatalog)} spaSelected=${result.usedSpaSelectedGameNavigation} spaReturn=${result.usedSpaReturnNavigation}`);

    if (result.secondReturnShowedLoadingGames) {
      throw new Error(`${baseUrl} showed "Loading games" on same-session catalog return`);
    }
    if (result.returnCatalog.catalogIndexRequests > 0) {
      throw new Error(`${baseUrl} refetched catalog index on same-session catalog return`);
    }
    if (result.returnCatalog.downloadUrlRequests > 0) {
      throw new Error(`${baseUrl} repeated download-url calls on same-session catalog return`);
    }
    if (enforceProductionBoundary) {
      const allWorkerAssetByteRequests = [
        ...result.firstCatalog.workerAssetByteRequests,
        ...result.selectedGame.workerAssetByteRequests,
        ...result.returnCatalog.workerAssetByteRequests,
      ];
      if (allWorkerAssetByteRequests.length > 0) {
        throw new Error(`${baseUrl} fetched asset bytes through worker routes: ${allWorkerAssetByteRequests.join(' | ')}`);
      }
    }

    return result;
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const baseUrl = normalizeBaseUrl(argValue('--base') ?? process.env.PAGES_ROUTE_MATRIX_BASE_URL ?? DEFAULT_BASE_URL);
  const compareBaseRaw = argValue('--compare-base') ?? process.env.PAGES_ROUTE_MATRIX_COMPARE_BASE;
  const compareBaseUrl = compareBaseRaw ? normalizeBaseUrl(compareBaseRaw) : '';
  const cacheCheck = hasFlag('--cache-check');
  const browser = await chromium.launch({ headless: true });

  try {
    const localResults = await runRouteMatrix(browser, baseUrl, 'local');
    if (compareBaseUrl) {
      const remoteResults = await runRouteMatrix(browser, compareBaseUrl, 'remote');
      compareRouteResults(localResults, remoteResults);
      console.log(`[route-matrix] title parity passed for ${localResults.length} route(s).`);
    }

    if (cacheCheck) {
      await runCatalogCacheCheck(browser, baseUrl, false);
      if (compareBaseUrl) {
        await runCatalogCacheCheck(browser, compareBaseUrl, true);
      }
    }

    console.log('[route-matrix] Route matrix passed.');
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('[route-matrix] Fatal:', error);
  process.exit(1);
});
