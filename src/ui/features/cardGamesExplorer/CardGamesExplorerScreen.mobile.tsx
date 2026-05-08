import { CardGamesExplorerScreenShared } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.shared';
import type { CardGamesExplorerScreenProps } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen';

export function CardGamesExplorerScreenMobile(props: CardGamesExplorerScreenProps) {
  return <CardGamesExplorerScreenShared {...props} />;
}
