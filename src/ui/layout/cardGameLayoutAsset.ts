import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { CardGameLayoutDocument, LayoutPreset } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import {
  cloneCardGameLayoutDocument,
  hydrateCardGameLayoutAsset,
  normalizeCardGameLayoutDocument,
  resolveLayoutPreset as resolveLayoutPresetDomain,
  type SerializedCardGameLayoutAsset,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';

type LooseRecord = Record<string, unknown>;

export interface NormalizedCardGameLayoutDocument {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
  playerUiDefaults: CardGameLayoutDocument['playerUiDefaults'];
  hud: CardGameLayoutDocument['hud'];
  cardFan: CardGameLayoutDocument['cardFan'];
  cardVisuals: CardGameLayoutDocument['cardVisuals'];
  views: Record<string, LayoutPreset>;
  gameplay: Record<string, unknown>;
  extensions: Record<string, unknown>;
  layoutStructure: LooseRecord;
}

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneRecord<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function getLayoutStructure(data: LooseRecord): LooseRecord {
  const nestedLayout = data.layout;
  if (isRecord(nestedLayout) && typeof nestedLayout.type === 'string' && Array.isArray(nestedLayout.sections)) {
    return cloneRecord(nestedLayout);
  }

  return {
    type: 'custom',
    sections: [],
  };
}

function getRootData(source: LooseRecord): LooseRecord {
  if (isRecord(source.data)) {
    return source.data;
  }
  return source;
}

export function readCardGameLayoutDocument(source: LooseRecord): NormalizedCardGameLayoutDocument {
  const data = getRootData(source);
  const normalized = normalizeCardGameLayoutDocument(data);

  return {
    defaultPlayerCount: normalized.defaultPlayerCount,
    presets: cloneRecord(normalized.presets),
    playerUiDefaults: cloneRecord(normalized.playerUiDefaults),
    hud: cloneRecord(normalized.hud),
    cardFan: cloneRecord(normalized.cardFan),
    cardVisuals: cloneRecord(normalized.cardVisuals),
    views: cloneRecord(normalized.views),
    gameplay: cloneRecord(normalized.gameplay),
    extensions: cloneRecord(normalized.extensions),
    layoutStructure: getLayoutStructure(data),
  };
}

export function toSerializedGameAssetFromLayoutSource(
  source: LooseRecord,
  gameId: string,
): SerializedCardGameLayoutAsset {
  const document = readCardGameLayoutDocument(source);
  const metadataSource = isRecord(source.metadata) ? source.metadata : {};

  const asset = hydrateCardGameLayoutAsset(
    {
      metadata: {
        ...metadataSource,
        gameId: typeof metadataSource.gameId === 'string' ? metadataSource.gameId : gameId,
        schemaVersion: typeof metadataSource.schemaVersion === 'number' ? metadataSource.schemaVersion : 1,
      },
      layout: {
        defaultPlayerCount: document.defaultPlayerCount,
        presets: document.presets,
        playerUiDefaults: document.playerUiDefaults,
        hud: document.hud,
        cardFan: document.cardFan,
        cardVisuals: document.cardVisuals,
        views: document.views,
        gameplay: document.gameplay,
        extensions: document.extensions,
      },
      gameplay: document.gameplay,
      extensions: document.extensions,
    },
    gameId,
  );

  return {
    metadata: asset.metadata,
    layout: cloneCardGameLayoutDocument(asset.layout),
    gameplay: cloneRecord(asset.gameplay),
    extensions: cloneRecord(asset.extensions),
  };
}

export function resolveLayoutPreset(
  document: NormalizedCardGameLayoutDocument,
  playerCount: number,
): LayoutPreset {
  return resolveLayoutPresetDomain(
    {
      defaultPlayerCount: document.defaultPlayerCount,
      presets: document.presets,
      playerUiDefaults: document.playerUiDefaults,
      hud: document.hud,
      cardFan: document.cardFan,
      cardVisuals: document.cardVisuals,
      views: document.views,
      gameplay: document.gameplay,
      extensions: document.extensions,
    },
    playerCount,
  );
}

function isInlineLayoutSource(value: unknown): value is LooseRecord {
  if (!isRecord(value)) {
    return false;
  }

  const nestedData = Reflect.get(value, 'data');
  return isRecord(nestedData) || 'defaultPlayerCount' in value || 'presets' in value || 'layout' in value;
}

export async function loadCardGameLayoutDocument(
  layoutAsset: AssetResourceEntry<unknown> | object | null | undefined,
): Promise<NormalizedCardGameLayoutDocument | null> {
  if (!layoutAsset) {
    return null;
  }

  if (layoutAsset instanceof AssetResourceEntry) {
    const parsed = await loadRawAssetDocumentByGuid(String(layoutAsset.guid));
    if (!isRecord(parsed)) {
      return null;
    }

    return readCardGameLayoutDocument(parsed);
  }

  if (isInlineLayoutSource(layoutAsset)) {
    return readCardGameLayoutDocument(layoutAsset);
  }

  return null;
}
