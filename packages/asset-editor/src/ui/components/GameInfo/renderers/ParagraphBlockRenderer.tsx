import type { ParagraphBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';

interface ParagraphBlockRendererProps {
  block: ParagraphBlock;
}

export const ParagraphBlockRenderer: React.FC<ParagraphBlockRendererProps> = ({ block }) => {
  return <p>{block.text}</p>;
};

