import type { CalculationBlock } from '@/ui/components/GameInfo/types';
import { GameInfoCSSClasses } from '@/ui/components/GameInfo/constants';

interface CalculationBlockRendererProps {
  block: CalculationBlock;
}

export const CalculationBlockRenderer: React.FC<CalculationBlockRendererProps> = ({ block }) => {
  return (
    <div className={GameInfoCSSClasses.Calculation}>
      {block.steps.map((step, index) => (
        <div key={index}>
          <strong>{step.label}: </strong>
          <code>{step.formula}</code>
          {step.result && <span> = {step.result}</span>}
        </div>
      ))}
      {block.total && (
        <div className={GameInfoCSSClasses.BudgetInfo}>
          <strong>Total: {block.total}</strong>
        </div>
      )}
    </div>
  );
};

