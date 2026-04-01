import type { HeadingBlock } from '@/ui/components/GameInfo/types';

interface HeadingBlockRendererProps {
  block: HeadingBlock;
}

export const HeadingBlockRenderer: React.FC<HeadingBlockRendererProps> = ({ block }) => {
  const HeadingTag = block.level === 3 ? 'h3' : 'h4';
  return (
    <HeadingTag>
      {block.icon && <span>{block.icon} </span>}
      {block.text}
    </HeadingTag>
  );
};

