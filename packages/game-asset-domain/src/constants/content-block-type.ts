export const ContentBlockType = {
  Text: 'text',
  Paragraph: 'paragraph',
  Heading: 'heading',
  List: 'list',
  RuleBlock: 'rule-block',
  StrategyBlock: 'strategy-block',
  Example: 'example',
  Formula: 'formula',
  SetupGrid: 'setup-grid',
  Highlight: 'highlight',
  CardValues: 'card-values',
  Calculation: 'calculation',
  PropertyTable: 'property-table',
  RankingList: 'ranking-list',
  PatternPreview: 'pattern-preview',
  Callout: 'callout',
} as const;

export type ContentBlockType = typeof ContentBlockType[keyof typeof ContentBlockType];
