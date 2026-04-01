import type { ExampleBlock } from '@/ui/components/GameInfo/types';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface ExampleBlockRendererProps {
  block: ExampleBlock;
}

export const ExampleBlockRenderer: React.FC<ExampleBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.ExampleBlock}>
      {block.title && <h5>{block.title}</h5>}
      <div className={GameInfoCSSClasses.Example}>
        <p>{block.text}</p>
        {block.result && <p className={GameInfoCSSClasses.Calculation}>{block.result}</p>}
      </div>
    </div>
  );
};

