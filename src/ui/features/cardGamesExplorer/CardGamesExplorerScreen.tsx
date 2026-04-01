import { CardGamesExplorerScreenWeb } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';

export const CardGamesExplorerScreen = createPlatformScreen<Record<string, never>>(
  CardGamesExplorerScreenWeb,
  () => import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.desktop').then((m) => ({ default: m.CardGamesExplorerScreenDesktop })),
  () => import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.mobile').then((m) => ({ default: m.CardGamesExplorerScreenMobile }))
);
