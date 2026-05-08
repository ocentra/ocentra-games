import { CardGamesExplorerScreenShared } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen.shared';
import type { CardGamesExplorerScreenProps } from '@/ui/features/cardGamesExplorer/CardGamesExplorerScreen';

export function CardGamesExplorerScreenDesktop(props: CardGamesExplorerScreenProps) {
  return <CardGamesExplorerScreenShared {...props} />;
}
