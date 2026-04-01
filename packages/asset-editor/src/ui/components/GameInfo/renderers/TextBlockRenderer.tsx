import type { TextBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';
import { EmphasisType } from '@ocentra/game-asset-domain/constants/emphasis-type';

interface TextBlockRendererProps {
  block: TextBlock;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ block }) => {
  if (block.emphasis === EmphasisType.Strong || block.emphasis === EmphasisType.Bold) {
    return <strong className={GameInfoCSSClasses.Strong}>{block.text}</strong>;
  }
  if (block.emphasis === EmphasisType.Italic) {
    return <em className={GameInfoCSSClasses.Emphasis}>{block.text}</em>;
  }
  return <span>{block.text}</span>;
};

