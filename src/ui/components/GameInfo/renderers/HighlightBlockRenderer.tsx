import type { HighlightBlock } from '@/ui/components/GameInfo/types';
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

