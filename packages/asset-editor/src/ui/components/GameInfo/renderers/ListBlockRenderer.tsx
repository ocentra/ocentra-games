import type { ListBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';
import { ListStyleType } from '@ocentra/game-asset-domain/constants/list-style-type';

interface ListBlockRendererProps {
  block: ListBlock;
}

export const ListBlockRenderer: React.FC<ListBlockRendererProps> = ({ block }) => {
  const ListTag = block.style === ListStyleType.Ordered ? 'ol' : 'ul';
  const className = block.style === ListStyleType.Ordered 
    ? GameInfoCSSClasses.OrderedList 
    : GameInfoCSSClasses.UnorderedList;

  return (
    <ListTag className={className}>
      {block.items.map((item, index) => (
        <li key={index}>
          {item.text}
          {item.subItems && item.subItems.length > 0 && (
            <ul>
              {item.subItems.map((subItem, subIndex) => (
                <li key={subIndex}>{subItem}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ListTag>
  );
};

