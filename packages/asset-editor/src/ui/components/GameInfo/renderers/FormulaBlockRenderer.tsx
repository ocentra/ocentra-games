import type { FormulaBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface FormulaBlockRendererProps {
  block: FormulaBlock;
}

export const FormulaBlockRenderer: React.FC<FormulaBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.Formula}>
      {block.label && <strong>{block.label}: </strong>}
      <code>{block.formula}</code>
    </div>
  );
};

