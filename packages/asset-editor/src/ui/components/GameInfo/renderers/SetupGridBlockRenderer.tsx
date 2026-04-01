import type { SetupGridBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
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

