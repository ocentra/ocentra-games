import { CardGamesExplorerPage } from '@/ui/pages/dev/CardGamesExplorer/CardGamesExplorerPage';
import type { CardGamesExplorerScreenProps } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen';

export function CardGamesExplorerScreenShared(props: CardGamesExplorerScreenProps) {
  return <CardGamesExplorerPage {...props} />;
}
