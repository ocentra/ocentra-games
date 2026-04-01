import type { SetupGridBlock } from '@/ui/components/GameInfo/types';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface SetupGridBlockRendererProps {
  block: SetupGridBlock;
}

export const SetupGridBlockRenderer: React.FC<SetupGridBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.SetupGrid}>
      {block.items.map((item, index) => (
        <div key={index} className={GameInfoCSSClasses.SetupItem}>
          <span>{item.icon}</span>
          <div>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

