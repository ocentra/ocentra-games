import type { ContentBlock } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { ContentBlockType } from '@ocentra/game-asset-domain/constants/content-block-type';
import { TextBlockRenderer } from './renderers/TextBlockRenderer';
import { ParagraphBlockRenderer } from './renderers/ParagraphBlockRenderer';
import { HeadingBlockRenderer } from './renderers/HeadingBlockRenderer';
import { ListBlockRenderer } from './renderers/ListBlockRenderer';
import { RuleBlockRenderer } from './renderers/RuleBlockRenderer';
import { StrategyBlockRenderer } from './renderers/StrategyBlockRenderer';
import { ExampleBlockRenderer } from './renderers/ExampleBlockRenderer';
import { FormulaBlockRenderer } from './renderers/FormulaBlockRenderer';
import { SetupGridBlockRenderer } from './renderers/SetupGridBlockRenderer';
import { HighlightBlockRenderer } from './renderers/HighlightBlockRenderer';
import { CardValuesBlockRenderer } from './renderers/CardValuesBlockRenderer';
import { CalculationBlockRenderer } from './renderers/CalculationBlockRenderer';

interface ContentBlockRendererProps {
  block: ContentBlock;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  if (!block || !block.type) {
    return null;
  }
  
  switch (block.type) {
    case ContentBlockType.Text:
      return <TextBlockRenderer block={block} />;
    case ContentBlockType.Paragraph:
      return <ParagraphBlockRenderer block={block} />;
    case ContentBlockType.Heading:
      return <HeadingBlockRenderer block={block} />;
    case ContentBlockType.List:
      return <ListBlockRenderer block={block} />;
    case ContentBlockType.RuleBlock:
      return <RuleBlockRenderer block={block} />;
    case ContentBlockType.StrategyBlock:
      return <StrategyBlockRenderer block={block} />;
    case ContentBlockType.Example:
      return <ExampleBlockRenderer block={block} />;
    case ContentBlockType.Formula:
      return <FormulaBlockRenderer block={block} />;
    case ContentBlockType.SetupGrid:
      return <SetupGridBlockRenderer block={block} />;
    case ContentBlockType.Highlight:
      return <HighlightBlockRenderer block={block} />;
    case ContentBlockType.CardValues:
      return <CardValuesBlockRenderer block={block} />;
    case ContentBlockType.Calculation:
      return <CalculationBlockRenderer block={block} />;
    default:
      return null;
  }
};

