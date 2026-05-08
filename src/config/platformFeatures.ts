import { PublicRouteKey, PublicRoutePath } from '@ocentra/endpoint-domain/constants/public-routes';

export const PlatformShell = {
  Web: 'web',
  Desktop: 'desktop',
  Mobile: 'mobile',
} as const;

export type PlatformShell = (typeof PlatformShell)[keyof typeof PlatformShell];

export const RouteFeature = {
  AIPlayground: 'AIPlayground',
  AIModelListEditor: 'AIModelListEditor',
  Logs: 'Logs',
  DevPanel: 'DevPanel',
  Admin: 'Admin',
  CardGamesExplorer: 'CardGamesExplorer',
  GamePlay: 'GamePlay',
  PlatformInspector: 'PlatformInspector',
} as const;

export type RouteFeature = (typeof RouteFeature)[keyof typeof RouteFeature];

export interface RouteFeatureConfig {
  path: string;
  devOnly: boolean;
  platforms: PlatformShell[];
}

export const ROUTE_FEATURES: Record<RouteFeature, RouteFeatureConfig> = {
  [RouteFeature.AIPlayground]: {
    path: '/AIPlayground',
    devOnly: true,
    platforms: [PlatformShell.Web, PlatformShell.Desktop],
  },
  [RouteFeature.AIModelListEditor]: {
    path: '/AI/ModelList',
    devOnly: true,
    platforms: [PlatformShell.Web, PlatformShell.Desktop],
  },
  [RouteFeature.Logs]: {
    path: '/logs',
    devOnly: true,
    platforms: [PlatformShell.Web, PlatformShell.Desktop],
  },
  [RouteFeature.DevPanel]: {
    path: '/dev-panel',
    devOnly: true,
    platforms: [PlatformShell.Web, PlatformShell.Desktop],
  },
  [RouteFeature.Admin]: {
    path: PublicRoutePath[PublicRouteKey.Admin],
    devOnly: false,
    platforms: [PlatformShell.Web, PlatformShell.Desktop, PlatformShell.Mobile],
  },
  [RouteFeature.CardGamesExplorer]: {
    path: PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer],
    devOnly: false,
    platforms: [PlatformShell.Web, PlatformShell.Desktop, PlatformShell.Mobile],
  },
  [RouteFeature.GamePlay]: {
    path: PublicRoutePath[PublicRouteKey.GamePlay],
    devOnly: false,
    platforms: [PlatformShell.Web, PlatformShell.Desktop, PlatformShell.Mobile],
  },
  [RouteFeature.PlatformInspector]: {
    path: '/__dev/platform-inspector',
    devOnly: true,
    platforms: [PlatformShell.Web, PlatformShell.Desktop],
  },
};

export const RoutePath = {
  CatchAll: '/*',
} as const;

export function isRouteEnabled(
  feature: RouteFeature,
  platform: PlatformShell,
  isDev: boolean
): boolean {
  const config = ROUTE_FEATURES[feature];
  if (!config.platforms.includes(platform)) return false;
  if (config.devOnly && !isDev) return false;
  return true;
}
