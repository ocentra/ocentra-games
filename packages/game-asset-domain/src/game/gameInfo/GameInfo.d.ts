import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { GameMode } from '@/gameMode/core/GameMode';
import { PageSectionType } from '@/constants/page-section-type';
import { AssetTypeReferenceType } from '@/constants/asset-type-reference-type';
import { ContentType } from '@/constants/content-type';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import { EmphasisType } from '@/constants/emphasis-type';
import type { SynthesisManifest } from '@ocentra/eventing-domain/types/app-stubs';
export interface HeroSection {
    title: string;
    subtitle?: string;
    backgroundImageRef?: AssetReference | string;
    ctaButtons?: Array<{
        label: string;
        href?: string;
        onClick?: string;
    }>;
}
export interface AssetTypeReference {
    assetType: AssetTypeReferenceType;
    contentType?: ContentType;
}
export interface TextBlock {
    type: typeof ContentBlockType.Text;
    text: string;
    emphasis?: EmphasisType;
}
export interface ParagraphBlock {
    type: typeof ContentBlockType.Paragraph;
    text: string;
}
export interface HeadingBlock {
    type: typeof ContentBlockType.Heading;
    level: 3 | 4;
    text: string;
    icon?: string;
}
export interface ListItem {
    text: string;
    subItems?: string[];
}
export interface ListBlock {
    type: typeof ContentBlockType.List;
    style: ListStyleType;
    items: ListItem[];
}
export interface RuleBlock {
    type: typeof ContentBlockType.RuleBlock;
    title?: string;
    content: ContentBlock[];
}
export interface StrategyBlock {
    type: typeof ContentBlockType.StrategyBlock;
    title: string;
    icon?: string;
    description: string;
    example?: ExampleBlock;
}
export interface ExampleBlock {
    type: typeof ContentBlockType.Example;
    title?: string;
    text: string;
    result?: string;
}
export interface FormulaBlock {
    type: typeof ContentBlockType.Formula;
    formula: string;
    label?: string;
}
export interface SetupGridItem {
    icon: string;
    label: string;
    detail: string;
}
export interface SetupGridBlock {
    type: typeof ContentBlockType.SetupGrid;
    items: SetupGridItem[];
}
export interface HighlightBlock {
    type: typeof ContentBlockType.Highlight;
    text: string;
    emphasis?: boolean;
}
export interface CardValue {
    card: string;
    value: number;
}
export interface CardValuesBlock {
    type: typeof ContentBlockType.CardValues;
    values: CardValue[];
}
export interface CalculationStep {
    label: string;
    formula: string;
    result?: string;
}
export interface CalculationBlock {
    type: typeof ContentBlockType.Calculation;
    steps: CalculationStep[];
    total?: string;
}
export type ContentBlock = TextBlock | ParagraphBlock | HeadingBlock | ListBlock | RuleBlock | StrategyBlock | ExampleBlock | FormulaBlock | SetupGridBlock | HighlightBlock | CardValuesBlock | CalculationBlock;
export interface Page {
    title: string;
    subtitle?: string;
    /** PRE-BAKED UI content from synthesis */
    content: ContentBlock[];
    /** GUIDs of assets that contributed to this page */
    linkedAssets?: string[];
    /** @deprecated use 'content' for pre-baked blocks */
    assetRefs?: AssetTypeReference[];
}
export interface PageSection {
    type: PageSectionType;
    tabLabel: string;
    pages?: Page[];
    subtitle?: string;
    title?: string;
    content?: string;
    imageRefs?: Array<AssetReference | string>;
    [key: string]: unknown;
}
export declare class GameInfo extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    synthesisManifest?: SynthesisManifest;
    static createTemplate(): Record<string, unknown>;
    hero: HeroSection;
    sections: PageSection[];
    description: string;
    tags: string[];
    comingSoon: boolean;
    minPlayers: number | null;
    maxPlayers: number | null;
    routePath: string;
    LLM: string;
    Player: string;
    tagline?: string;
    tagline2?: string;
    shortDescription?: string;
    gameIconImage?: ImageHash;
    /**
     * @deprecated RESOLUTION NOW HAPPENS AT EDITOR-TIME. Use pre-baked content property instead.
     * This method remains for migration purposes only.
     */
    resolveAssetRefs(_assetRefs: AssetTypeReference[], _gameMode: GameMode): Promise<ContentBlock[]>;
    /**
     * Extract plain text from content blocks for AI prompts.
     */
    extractTextContent(blocks: ContentBlock[]): string;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
