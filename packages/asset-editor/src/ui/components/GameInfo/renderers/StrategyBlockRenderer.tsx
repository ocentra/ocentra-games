import type { StrategyBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';
import { ExampleBlockRenderer } from './ExampleBlockRenderer';

interface StrategyBlockRendererProps {
  block: StrategyBlock;
}

export const StrategyBlockRenderer: React.FC<StrategyBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.StrategyBlock}>
      <h4>
        {block.icon && <span>{block.icon} </span>}
        {block.title}
      </h4>
      <p>{block.description}</p>
      {block.example && <ExampleBlockRenderer block={block.example} />}
    </div>
  );
};

