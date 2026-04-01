import type { RuleBlock } from '@/ui/components/GameInfo/types';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';
import { ContentBlockRenderer } from '@/ui/components/GameInfo/ContentBlockRenderer';

interface RuleBlockRendererProps {
  block: RuleBlock;
}

export const RuleBlockRenderer: React.FC<RuleBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.RuleBlock}>
      {block.title && <h4>{block.title}</h4>}
      <div>
        {block.content.map((contentBlock, index) => (
          <ContentBlockRenderer key={index} block={contentBlock} />
        ))}
      </div>
    </div>
  );
};

