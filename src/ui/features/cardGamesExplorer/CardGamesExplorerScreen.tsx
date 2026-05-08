import { CardGamesExplorerScreenWeb } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.web';
import { createPlatformScreen } from '@/ui/platform/createPlatformScreen';
import type { GamesExplorerDetailSection } from '@ocentra/core-ui/GamesExplorer/types';

export interface CardGamesExplorerScreenProps {
  catalogScope?: 'all' | 'card-games';
  initialCategorySlug?: string;
  initialGameSlug?: string;
  initialDetailSection?: GamesExplorerDetailSection;
}

export const CardGamesExplorerScreen = createPlatformScreen<CardGamesExplorerScreenProps>(
  CardGamesExplorerScreenWeb,
  () => import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.desktop').then((m) => ({ default: m.CardGamesExplorerScreenDesktop })),
  () => import('@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.mobile').then((m) => ({ default: m.CardGamesExplorerScreenMobile }))
);
