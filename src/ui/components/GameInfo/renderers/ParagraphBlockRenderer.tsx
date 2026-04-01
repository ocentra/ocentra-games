import type { ParagraphBlock } from '@/ui/components/GameInfo/types';

interface ParagraphBlockRendererProps {
  block: ParagraphBlock;
}

export const ParagraphBlockRenderer: React.FC<ParagraphBlockRendererProps> = ({ block }) => {
  return <p>{block.text}</p>;
};

