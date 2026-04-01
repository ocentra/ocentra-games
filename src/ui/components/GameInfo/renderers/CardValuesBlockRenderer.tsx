import type { CardValuesBlock } from '@/ui/components/GameInfo/types';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface CardValuesBlockRendererProps {
  block: CardValuesBlock;
}

export const CardValuesBlockRenderer: React.FC<CardValuesBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.CardValues}>
      <table>
        <thead>
          <tr>
            <th>Card</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {block.values.map((value, index) => (
            <tr key={index}>
              <td>{value.card}</td>
              <td>{value.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

