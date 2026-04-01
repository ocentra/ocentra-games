import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';

export const AssetStatus = {
  Published: 'Published',        // Live and ready for production use
  Draft: 'Draft',                // Work in progress, not ready
  ComingSoon: 'ComingSoon',      // Announced but not yet available
  Archived: 'Archived',          // Deprecated/removed, hidden from public
} as const;

export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];

export const AssetTypeCategory = {
  GameMode: 'GameMode',
  Image: 'Image',
  Card: 'Card',
  Layout: 'Layout',
  Page: 'Page',
  UI: 'UI',
  AI: 'AI',
  Rules: 'Rules',
  Content: 'Content',
  Other: 'Other',
} as const;

export type AssetTypeCategory = typeof AssetTypeCategory[keyof typeof AssetTypeCategory];

export const AssetTag = {
  // Page-related
  PageAsset: 'page-asset',
  GamePageAsset: 'game-page-asset',
  HomePageAsset: 'home-page-asset',
  
  // Game-related
  GameModeAsset: 'game-mode-asset',
  GameRulesAsset: 'game-rules-asset',
  GameDescriptionAsset: 'game-description-asset',
  GameLayoutAsset: 'game-layout-asset',
  
  // Content-related
  ContentAsset: 'content-asset',
  ImageAsset: 'image-asset',
  CardAsset: 'card-asset',
  
  // UI-related
  UIComponentAsset: 'ui-component-asset',
  ButtonAsset: 'button-asset',
  
  // AI-related
  AIModelAsset: 'ai-model-asset',
  AIStrategyAsset: 'ai-strategy-asset',
} as const;

export type AssetTag = typeof AssetTag[keyof typeof AssetTag];

export interface BaseAssetMetadata {
  assetId: string;
  assetType: string;
  typeCategory?: AssetTypeCategory;
  tags?: string[];
  status?: AssetStatus;
  schemaVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  guid?: string;
  localPath?: string;
  remotePath?: string;
  synced?: boolean;
  lastSynced?: string;
}

@serializableClass({
  assetType: 'BaseAssetMetadata',
  displayName: 'Base Asset Metadata',
})
export abstract class BaseAssetMetadataClass {
  @serializable({ label: 'Type Category' })
  typeCategory: AssetTypeCategory | null = null;

  @serializable({ label: 'Tags' })
  tags: string[] = [];

  @serializable({ label: 'Status' })
  status: AssetStatus | null = null;

  @serializable({ label: 'Created At' })
  createdAt: string = '';

  @serializable({ label: 'Updated At' })
  updatedAt: string = '';

  @serializable({ label: 'GUID' })
  guid: string = '';
}

