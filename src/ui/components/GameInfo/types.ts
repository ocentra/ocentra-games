import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import type { ContentBlockValidated } from '@ocentra/game-asset-domain/schemas/content-shapes';

type ContentBlockWithoutRule = Exclude<ContentBlockValidated, { type: 'rule-block' }>;

export type PageSectionTypeValue =
  | 'about'
  | 'rules'
  | 'strategy'
  | 'scoring'
  | 'text'
  | 'screenshots'
  | 'custom';

export interface RuleBlock {
  type: 'rule-block';
  title?: string;
  content: ContentBlock[];
}

export type ContentBlock = ContentBlockWithoutRule | RuleBlock;
export interface Page {
  title: string;
  subtitle?: string;
  content: ContentBlock[];
  linkedAssets?: string[];
}

export interface PageSection {
  type: PageSectionTypeValue;
  tabLabel: string;
  pages?: Page[];
  subtitle?: string;
  title?: string;
  content?: string;
  imageRefs?: Array<AssetReference | { guid?: string | null } | string>;
}

export type TextBlock = Extract<ContentBlock, { type: 'text' }>;
export type ParagraphBlock = Extract<ContentBlock, { type: 'paragraph' }>;
export type HeadingBlock = Extract<ContentBlock, { type: 'heading' }>;
export type ListBlock = Extract<ContentBlock, { type: 'list' }>;
export type StrategyBlock = Extract<ContentBlock, { type: 'strategy-block' }>;
export type ExampleBlock = Extract<ContentBlock, { type: 'example' }>;
export type FormulaBlock = Extract<ContentBlock, { type: 'formula' }>;
export type SetupGridBlock = Extract<ContentBlock, { type: 'setup-grid' }>;
export type HighlightBlock = Extract<ContentBlock, { type: 'highlight' }>;
export type CardValuesBlock = Extract<ContentBlock, { type: 'card-values' }>;
export type CalculationBlock = Extract<ContentBlock, { type: 'calculation' }>;

export interface HeroSection {
  title: string;
  subtitle?: string;
  backgroundImageRef?: { guid?: string | null } | string;
  ctaButtons?: Array<{
    label: string;
    href?: string;
    onClick?: string;
  }>;
}

export interface PageAssetLike {
  hero?: HeroSection | null;
  sections?: PageSection[];
}
