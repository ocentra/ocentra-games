import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { CardGameLayoutDocument, LayoutPreset } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import { getGameModeEntries } from '@/adapters/assets/GameCatalogService';
import {
  cloneCardGameLayoutDocument,
  hydrateCardGameLayoutAsset,
  normalizeCardGameLayoutDocument,
  PLAIN_CARD_FRAME_DEFAULTS,
  resolveLayoutPreset as resolveLayoutPresetDomain,
  type SerializedCardGameLayoutAsset,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';

type LooseRecord = Record<string, unknown>;

export interface NormalizedCardGameLayoutDocument {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
  playerUiDefaults: CardGameLayoutDocument['playerUiDefaults'];
  hud: CardGameLayoutDocument['hud'];
  scoreboard: CardGameLayoutDocument['scoreboard'];
  cardStrip: CardGameLayoutDocument['cardStrip'];
  deckTray: CardGameLayoutDocument['deckTray'];
  cardFan: CardGameLayoutDocument['cardFan'];
  cardVisuals: CardGameLayoutDocument['cardVisuals'];
  cardFrame: NonNullable<CardGameLayoutDocument['cardFrame']>;
  renderToggles: CardGameLayoutDocument['renderToggles'];
  tablePresentation: CardGameLayoutDocument['tablePresentation'];
  tableAttachments: CardGameLayoutDocument['tableAttachments'];
  views: Record<string, LayoutPreset>;
  stageLayout: CardGameLayoutDocument['stageLayout'];
  zones: NonNullable<CardGameLayoutDocument['zones']>;
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

function extractGuid(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.guid === 'string' && value.guid.length > 0 ? value.guid : null;
}

export function readCardGameLayoutDocument(source: LooseRecord): NormalizedCardGameLayoutDocument {
  const data = getRootData(source);
  const normalized = normalizeCardGameLayoutDocument(data);
  const gameplay = isRecord(data.gameplay) ? cloneRecord(data.gameplay) : cloneRecord(normalized.gameplay);
  const extensions = isRecord(data.extensions) ? cloneRecord(data.extensions) : cloneRecord(normalized.extensions);

  return {
    defaultPlayerCount: normalized.defaultPlayerCount,
    presets: cloneRecord(normalized.presets),
    playerUiDefaults: cloneRecord(normalized.playerUiDefaults),
    hud: cloneRecord(normalized.hud),
    scoreboard: cloneRecord(normalized.scoreboard),
    cardStrip: cloneRecord(normalized.cardStrip),
    deckTray: cloneRecord(normalized.deckTray),
    cardFan: cloneRecord(normalized.cardFan),
    cardVisuals: cloneRecord(normalized.cardVisuals),
    cardFrame: cloneRecord(normalized.cardFrame ?? PLAIN_CARD_FRAME_DEFAULTS),
    renderToggles: cloneRecord(normalized.renderToggles),
    tablePresentation: cloneRecord(normalized.tablePresentation),
    tableAttachments: cloneRecord(normalized.tableAttachments),
    views: cloneRecord(normalized.views),
    stageLayout: cloneRecord(normalized.stageLayout),
    zones: cloneRecord(normalized.zones ?? []),
    gameplay,
    extensions,
    layoutStructure: getLayoutStructure(data),
  };
}

export function toSerializedGameAssetFromLayoutSource(
  source: LooseRecord,
  gameId: string,
): SerializedCardGameLayoutAsset {
  const document = readCardGameLayoutDocument(source);
  const data = getRootData(source);
  const metadataSource = isRecord(source.metadata) ? source.metadata : {};
  const gameplay = isRecord(data.gameplay) ? cloneRecord(data.gameplay) : cloneRecord(document.gameplay);
  const extensions = isRecord(data.extensions) ? cloneRecord(data.extensions) : cloneRecord(document.extensions);

  const asset = hydrateCardGameLayoutAsset(
    {
      metadata: {
        ...metadataSource,
        gameId: typeof metadataSource.gameId === 'string' ? metadataSource.gameId : gameId,
        schemaVersion: typeof metadataSource.schemaVersion === 'number' ? metadataSource.schemaVersion : 2,
      },
      layout: {
        defaultPlayerCount: document.defaultPlayerCount,
        presets: document.presets,
        playerUiDefaults: document.playerUiDefaults,
        hud: document.hud,
        scoreboard: document.scoreboard,
        cardStrip: document.cardStrip,
        deckTray: document.deckTray,
        cardFan: document.cardFan,
        cardVisuals: document.cardVisuals,
        cardFrame: document.cardFrame,
        renderToggles: document.renderToggles,
        tablePresentation: document.tablePresentation,
        tableAttachments: document.tableAttachments,
        views: document.views,
        stageLayout: document.stageLayout,
        zones: document.zones,
        gameplay,
        extensions,
      },
      gameplay,
      extensions,
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
      scoreboard: document.scoreboard,
      cardStrip: document.cardStrip,
      deckTray: document.deckTray,
      cardFan: document.cardFan,
      cardVisuals: document.cardVisuals,
      cardFrame: document.cardFrame,
      renderToggles: document.renderToggles,
      tablePresentation: document.tablePresentation,
      tableAttachments: document.tableAttachments,
      views: document.views,
      stageLayout: document.stageLayout,
      zones: document.zones,
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

export async function loadSavedCardGameLayoutDocument(gameId: string): Promise<NormalizedCardGameLayoutDocument | null> {
  const entries = await getGameModeEntries();
  const entry = entries.find((candidate) => candidate.gameId === gameId);
  if (!entry) {
    return null;
  }

  const gameModeRoot = await loadRawAssetDocumentByGuid(String(entry.guid));
  if (!isRecord(gameModeRoot)) {
    return null;
  }

  const gameModeData = getRootData(gameModeRoot);
  const layoutGuid = extractGuid(gameModeData.layoutAsset);
  if (!layoutGuid) {
    return null;
  }

  const layoutRoot = await loadRawAssetDocumentByGuid(layoutGuid);
  if (!isRecord(layoutRoot)) {
    return null;
  }

  return readCardGameLayoutDocument(layoutRoot);
}
