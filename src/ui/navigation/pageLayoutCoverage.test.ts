import fs from 'node:fs';
import path from 'node:path';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';
import { PublicRouteKey, PublicRoutePath } from '@ocentra/endpoint-domain/constants/public-routes';

interface PageLayoutAssetData {
  routePath?: string;
  routeAliases?: string[];
  pageId?: string;
  kind?: string;
}

interface PageLayoutAssetEnvelope {
  data?: PageLayoutAssetData;
}

const pagesRoot = path.resolve(process.cwd(), 'packages/asset-editor/Resources/Pages');

const expectedAssets = [
  'HomePageLayout.asset',
  'GameCatalogPageLayout.asset',
  'SelectedGameLayout.asset',
  'ShopPageLayout.asset',
  'SocialPageLayout.asset',
  'PlayerHubPageLayout.asset',
  'AdminPageLayout.asset',
  'CompetitionPageLayout.asset',
  'TournamentsPageLayout.asset',
  'TournamentDetailPageLayout.asset',
  'LeaderboardPageLayout.asset',
  'GameLeaderboardPageLayout.asset',
  'AiBenchmarkLeaderboardPageLayout.asset',
  'SettingsPageLayout.asset',
  'LobbyPageLayout.asset',
  'MatchmakingPageLayout.asset',
] as const;

const expectedRouteCoverage = {
  [PublicRoutePath[PublicRouteKey.Home]]: 'HomePageLayout.asset',
  [PublicRoutePath[PublicRouteKey.GamesCatalog]]: 'GameCatalogPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.CardGamesCatalog]]: 'GameCatalogPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer]]: 'GameCatalogPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Game]]: 'SelectedGameLayout.asset',
  [PublicRoutePath[PublicRouteKey.Shop]]: 'ShopPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Social]]: 'SocialPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.PlayerHub]]: 'PlayerHubPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Admin]]: 'AdminPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.AdminUsers]]: 'AdminPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Competition]]: 'CompetitionPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Tournaments]]: 'TournamentsPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.TournamentDetail]]: 'TournamentDetailPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Leaderboard]]: 'LeaderboardPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.GameLeaderboard]]: 'GameLeaderboardPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard]]: 'AiBenchmarkLeaderboardPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Settings]]: 'SettingsPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Lobby]]: 'LobbyPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.GameLobby]]: 'LobbyPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.Matchmaking]]: 'MatchmakingPageLayout.asset',
  [PublicRoutePath[PublicRouteKey.GameMatchmaking]]: 'MatchmakingPageLayout.asset',
} as const;

function readPageLayoutAsset(fileName: string): PageLayoutAssetData {
  const assetPath = path.join(pagesRoot, fileName);
  const envelope = JSON5.parse(fs.readFileSync(assetPath, 'utf8')) as PageLayoutAssetEnvelope;
  return envelope.data ?? {};
}

function coveredRoutes(data: PageLayoutAssetData): string[] {
  return [data.routePath, ...(data.routeAliases ?? [])].filter((value): value is string => Boolean(value));
}

describe('PageLayout route coverage', () => {
  it('keeps a PageLayout asset for every real public page surface', () => {
    for (const fileName of expectedAssets) {
      expect(fs.existsSync(path.join(pagesRoot, fileName)), fileName).toBe(true);
    }
  });

  it('maps every real app page route to a PageLayout asset or declared alternate owner', () => {
    for (const [routePath, fileName] of Object.entries(expectedRouteCoverage)) {
      const data = readPageLayoutAsset(fileName);
      expect(coveredRoutes(data), routePath).toContain(routePath);
    }
    expect(PublicRoutePath[PublicRouteKey.GamePlay]).toBe('/games/:gameId/play');
  });
});
