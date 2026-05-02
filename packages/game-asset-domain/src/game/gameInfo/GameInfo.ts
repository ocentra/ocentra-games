import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { generateAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { GameMode } from '@/gameMode/core/GameMode';
import { PageSectionType } from '@/constants/page-section-type';
import { AssetTypeReferenceType } from '@/constants/asset-type-reference-type';
import { ContentType } from '@/constants/content-type';
import { ContentBlockType } from '@/constants/content-block-type';
import { ListStyleType } from '@/constants/list-style-type';
import { EmphasisType } from '@/constants/emphasis-type';
import type { SynthesisManifest } from '@ocentra/eventing-domain/types/app-stubs';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { Category, SubCategory } from '@ocentra/game-domain/game/categories';
import type { Difficulty } from '@ocentra/game-domain/game/difficulty';
import type { PlayerMode } from '@ocentra/game-domain/game/playerMode';
import { CATEGORY } from '@ocentra/game-domain/game/categories';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_GAMEINFO = false;

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

export type ContentBlock =
  | TextBlock
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | RuleBlock
  | StrategyBlock
  | ExampleBlock
  | FormulaBlock
  | SetupGridBlock
  | HighlightBlock
  | CardValuesBlock
  | CalculationBlock;

export interface IContentSynthesisProvider {
  synthesizeUIContent(ctx: import('@ocentra/eventing-domain/types/app-stubs').SynthesisContext): ContentBlock[];
}

export function isContentSynthesisProvider(
  asset: unknown
): asset is IContentSynthesisProvider {
  return (
    typeof asset === 'object' &&
    asset !== null &&
    'synthesizeUIContent' in asset &&
    typeof (asset as IContentSynthesisProvider).synthesizeUIContent === 'function'
  );
}

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

export interface HistoryContent {
  origins?: string;
  timeline?: string[];
  evolution?: string;
  cultural?: string;
}

export interface SetupContent {
  players?: string;
  deck?: string;
  equipment?: string;
  dealing?: string;
}

export interface VariationItem {
  id: string;
  name: string;
  description: string;
}

export interface VariationsContent {
  list?: VariationItem[];
  noVariationsReason?: string;
}

export interface AIContent {
  difficulty?: { easy?: string; medium?: string; hard?: string };
  considerations?: string[];
}

export interface SourceItem {
  name: string;
  url: string;
}

export interface SourcesContent {
  primary?: SourceItem[];
  additional?: string[];
}

export interface GameInfoExplorerData {
  slug?: string;
  name?: string;
  gameCategory?: Category | string;
  subcategory?: SubCategory | string | null;
  playerMode?: PlayerMode | string;
  difficulty?: Difficulty | string;
  duration?: string;
  origin?: string;
  deck?: string;
  alsoKnownAs?: string[];
  playersDisplay?: string;
  description?: string;
  tags?: string[];
  sections?: PageSection[];
  minPlayers?: number | null;
  maxPlayers?: number | null;
  completeness?: Record<string, boolean>;
  quality?: string;
  overview?: unknown;
  history?: unknown;
  setup?: unknown;
  rules?: unknown;
  strategy?: unknown;
  variations?: unknown;
  ai?: unknown;
  sources?: unknown;
  historyContent?: HistoryContent;
  setupContent?: SetupContent;
  variationsContent?: VariationsContent;
  aiContent?: AIContent;
  sourcesContent?: SourcesContent;
}

@serializableClass({
  schemaVersion: 2,
  assetType: 'GameInfo',
  displayName: 'Game Info',
  icon: '📄',
  category: AssetTypeCategory.Content,
})
export class GameInfo extends ScriptableObject {

  static override schemaVersion = 2;
  static readonly requiresInspector = true;

  @serializable({ label: 'Synthesis Manifest' })
  synthesisManifest?: SynthesisManifest;

  static override createTemplate(): Record<string, unknown> {
    return {
      hero: {
        title: 'New Game',
        subtitle: 'Game subtitle',
      },
      sections: [],
      description: '',
      tags: [],
      comingSoon: false,
      minPlayers: null,
      maxPlayers: null,
      routePath: '',
      LLM: '',
      Player: '',
      tagline: '',
      tagline2: '',
      shortDescription: '',
      gameIconImage: null,
      gameCategory: CATEGORY.UNKNOWN,
      subcategory: null,
      playerMode: 'multiplayer',
      difficulty: 'Beginner',
      duration: '',
      origin: '',
      deck: '',
      alsoKnownAs: [],
      playersDisplay: '',
      historyContent: null,
      setupContent: null,
      variationsContent: null,
      aiContent: null,
      sourcesContent: null,
      quality: null,
      completeness: null,
    };
  }

  @serializable({ label: 'Hero Section' })
  hero: HeroSection = {
    title: '',
  };

  @serializable({
    label: 'Sections',
    elementType: Object as unknown as new () => PageSection,
  })
  sections: PageSection[] = [];

  @serializable({ label: 'Description' })
  description: string = '';

  @serializable({ label: 'Tags', elementType: String })
  tags: string[] = [];

  @serializable({ label: 'Coming Soon' })
  comingSoon: boolean = false;

  @serializable({ label: 'Min Players' })
  minPlayers: number | null = null;

  @serializable({ label: 'Max Players' })
  maxPlayers: number | null = null;

  @serializable({ label: 'Route Path' })
  routePath: string = '';

  @serializable({ label: 'LLM Description' })
  LLM: string = '';

  @serializable({ label: 'Player Description' })
  Player: string = '';

  @serializable({ label: 'Tagline', group: 'Display' })
  tagline?: string;

  @serializable({ label: 'Tagline 2', group: 'Display' })
  tagline2?: string;

  @serializable({ label: 'Short Description', group: 'Display' })
  shortDescription?: string;

  @serializable({ label: 'Game Icon Image', group: 'Display' })
  gameIconImage?: ImageHash;

  @serializable({ label: 'Game Category', group: 'Explorer' })
  gameCategory: Category = CATEGORY.UNKNOWN;

  @serializable({ label: 'Subcategory', group: 'Explorer' })
  subcategory: SubCategory = null;

  @serializable({ label: 'Player Mode', group: 'Explorer' })
  playerMode: PlayerMode = 'multiplayer';

  @serializable({ label: 'Difficulty', group: 'Explorer' })
  difficulty: Difficulty = 'Beginner';

  @serializable({ label: 'Duration', group: 'Explorer' })
  duration: string = '';

  @serializable({ label: 'Origin', group: 'Explorer' })
  origin: string = '';

  @serializable({ label: 'Deck', group: 'Explorer' })
  deck: string = '';

  @serializable({ label: 'Also Known As', group: 'Explorer', elementType: String })
  alsoKnownAs: string[] = [];

  @serializable({ label: 'Players Display', group: 'Explorer' })
  playersDisplay: string = '';

  @serializable({ label: 'History Content', group: 'Sections' })
  historyContent: HistoryContent | null = null;

  @serializable({ label: 'Setup Content', group: 'Sections' })
  setupContent: SetupContent | null = null;

  @serializable({ label: 'Variations Content', group: 'Sections' })
  variationsContent: VariationsContent | null = null;

  @serializable({ label: 'AI Content', group: 'Sections' })
  aiContent: AIContent | null = null;

  @serializable({ label: 'Sources Content', group: 'Sections' })
  sourcesContent: SourcesContent | null = null;

  @serializable({ label: 'Quality', group: 'Explorer' })
  quality: string | null = null;

  @serializable({ label: 'Completeness', group: 'Explorer' })
  completeness: Record<string, boolean> | null = null;

  /**
   * @deprecated RESOLUTION NOW HAPPENS AT EDITOR-TIME. Use pre-baked content property instead.
   * This method remains for migration purposes only.
   */
  async resolveAssetRefs(_assetRefs: AssetTypeReference[], _gameMode: GameMode): Promise<ContentBlock[]> {
    void _assetRefs;
    void _gameMode;
    log.logWarn('GameInfo.resolveAssetRefs() is deprecated. Use editor-time synthesis instead.', getStackTrace(), {}, LOG_GAMEINFO);
    return [];
  }

  /**
   * Extract plain text from content blocks for AI prompts.
   */
  extractTextContent(blocks: ContentBlock[]): string {
    const textParts: string[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case ContentBlockType.Text:
        case ContentBlockType.Paragraph:
          textParts.push((block as ParagraphBlock).text);
          break;
        case ContentBlockType.Heading:
          textParts.push(`## ${(block as HeadingBlock).text}`);
          break;
        case ContentBlockType.Highlight:
          textParts.push(`**${(block as HighlightBlock).text}**`);
          break;
        case ContentBlockType.List: {
          const listBlock = block as ListBlock;
          for (const item of listBlock.items) {
            textParts.push(`• ${item.text}`);
            if (item.subItems) {
              for (const sub of item.subItems) {
                textParts.push(`  - ${sub}`);
              }
            }
          }
          break;
        }
        case ContentBlockType.Example: {
          const example = block as ExampleBlock;
          textParts.push(`Example: ${example.text}`);
          break;
        }
        case ContentBlockType.RuleBlock: {
          const ruleBlock = block as RuleBlock;
          if (ruleBlock.title) textParts.push(ruleBlock.title);
          textParts.push(this.extractTextContent(ruleBlock.content));
          break;
        }
        case ContentBlockType.StrategyBlock: {
          const strategyBlock = block as StrategyBlock;
          if (strategyBlock.title) textParts.push(strategyBlock.title);
          if (strategyBlock.description) textParts.push(strategyBlock.description);
          if (strategyBlock.example) textParts.push(`Example: ${strategyBlock.example.text}`);
          break;
        }
        // ... handle other block types
      }
    }

    return textParts.join('\n');
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const guid = await generateAssetGuid('GameInfo', context.gameId);
    const assetId = `${context.gameId}-info`;
    const routePath = context.gameId.toLowerCase();
    const data: Record<string, unknown> = {
      hero: {
        title: context.displayName,
        subtitle: `Play ${context.displayName}.`,
      },
      sections: [],
      description: `Welcome to ${context.displayName}.`,
      tags: [routePath, 'card-game'],
      comingSoon: false,
      minPlayers: 2,
      maxPlayers: 4,
      routePath,
      LLM: `Description for ${context.displayName}.`,
      Player: `Description for ${context.displayName}.`,
    };

    return {
      assetId,
      fileName: `info.asset`,
      guid,
      data,
    };
  }

  static fromExplorerData(data: GameInfoExplorerData): GameInfo {
    const gi = new GameInfo();
    gi.hero = { title: data.name ?? '' };
    gi.gameCategory = (data.gameCategory as Category) ?? CATEGORY.UNKNOWN;
    gi.subcategory = (data.subcategory as SubCategory) ?? null;
    gi.playerMode = (data.playerMode as PlayerMode) ?? 'multiplayer';
    gi.difficulty = (data.difficulty as Difficulty) ?? 'Beginner';
    gi.duration = data.duration ?? '';
    gi.origin = data.origin ?? '';
    gi.deck = data.deck ?? '';
    gi.alsoKnownAs = data.alsoKnownAs ?? [];
    gi.playersDisplay = data.playersDisplay ?? '';
    gi.description = data.description ?? '';
    gi.tags = data.tags ?? [];
    gi.sections = data.sections ?? [];
    if (data.minPlayers != null) gi.minPlayers = data.minPlayers;
    if (data.maxPlayers != null) gi.maxPlayers = data.maxPlayers;
    if (data.historyContent != null) gi.historyContent = data.historyContent;
    else if (data.history != null && typeof data.history === 'object') gi.historyContent = data.history as HistoryContent;
    if (data.setupContent != null) gi.setupContent = data.setupContent;
    else if (data.setup != null && typeof data.setup === 'object') gi.setupContent = data.setup as SetupContent;
    if (data.variationsContent != null) gi.variationsContent = data.variationsContent;
    else if (data.variations != null && typeof data.variations === 'object') gi.variationsContent = data.variations as VariationsContent;
    if (data.aiContent != null) gi.aiContent = data.aiContent;
    else if (data.ai != null && typeof data.ai === 'object') gi.aiContent = data.ai as AIContent;
    if (data.sourcesContent != null) gi.sourcesContent = data.sourcesContent;
    else if (data.sources != null && typeof data.sources === 'object') gi.sourcesContent = data.sources as SourcesContent;
    if (data.quality != null) gi.quality = data.quality;
    if (data.completeness != null) gi.completeness = data.completeness;
    return gi;
  }
}
