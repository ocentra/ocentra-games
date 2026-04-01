import type { HighlightBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface HighlightBlockRendererProps {
  block: HighlightBlock;
}

export const HighlightBlockRenderer: React.FC<HighlightBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.Highlight}>
      {block.emphasis ? <strong>{block.text}</strong> : <p>{block.text}</p>}
    </div>
  );
};

