import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';
import type { SerializedGameAsset, SerializedLayoutPreset } from './gameUiTypes';
import type { LayoutPreset } from './tableLayoutTypes';

const DEFAULT_PLAYER_COUNT = 4;
const DEFAULT_LAYOUT_STRUCTURE = {
  type: 'custom',
  sections: [],
} as const;

type LooseRecord = Record<string, unknown>;

export interface NormalizedCardGameLayoutDocument {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
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

function cloneSeat(seat: SeatLayout): SeatLayout {
  return {
    ...seat,
    position: { ...seat.position },
    playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
  };
}

function clonePreset(preset: SerializedLayoutPreset | LayoutPreset | undefined): LayoutPreset | null {
  if (!preset) {
    return null;
  }

  const table = isRecord(preset.table) ? { ...preset.table } : {};
  const seats = Array.isArray(preset.seats) ? preset.seats.map((seat) => cloneSeat(seat as SeatLayout)) : [];

  return {
    table,
    seats,
  };
}

function getRootData(source: LooseRecord): LooseRecord {
  if (isRecord(source.data)) {
    return source.data;
  }
  return source;
}

function getLayoutDocumentContainer(data: LooseRecord): LooseRecord {
  const nestedLayout = data.layout;
  if (isRecord(nestedLayout) && hasLayoutDocumentFields(nestedLayout)) {
    return nestedLayout;
  }
  return data;
}

function hasLayoutDocumentFields(value: unknown): value is LooseRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    'defaultPlayerCount',
    'presets',
    'playerUiDefaults',
    'views',
    'gameplay',
    'extensions',
  ].some((key) => key in value);
}

function getLayoutStructure(data: LooseRecord): LooseRecord {
  const nestedLayout = data.layout;
  if (
    isRecord(nestedLayout) &&
    typeof nestedLayout.type === 'string' &&
    Array.isArray(nestedLayout.sections)
  ) {
    return cloneRecord(nestedLayout);
  }

  return cloneRecord(DEFAULT_LAYOUT_STRUCTURE);
}

export function readCardGameLayoutDocument(source: LooseRecord): NormalizedCardGameLayoutDocument {
  const data = getRootData(source);
  const container = getLayoutDocumentContainer(data);
  const presetsSource = isRecord(container.presets)
    ? (container.presets as Record<string, SerializedLayoutPreset | LayoutPreset>)
    : {};

  return {
    defaultPlayerCount:
      typeof container.defaultPlayerCount === 'number'
        ? container.defaultPlayerCount
        : DEFAULT_PLAYER_COUNT,
    presets: Object.fromEntries(
      Object.entries(presetsSource)
        .map(([key, preset]) => [key, clonePreset(preset)])
        .filter((entry): entry is [string, LayoutPreset] => entry[1] !== null),
    ),
    gameplay: isRecord(container.gameplay)
      ? cloneRecord(container.gameplay)
      : isRecord(data.gameplay)
        ? cloneRecord(data.gameplay)
        : {},
    extensions: isRecord(container.extensions)
      ? cloneRecord(container.extensions)
      : isRecord(data.extensions)
        ? cloneRecord(data.extensions)
        : {},
    layoutStructure: getLayoutStructure(data),
  };
}

export function toSerializedGameAssetFromLayoutSource(
  source: LooseRecord,
  gameId: string,
): SerializedGameAsset {
  const document = readCardGameLayoutDocument(source);
  const metadataSource = isRecord(source.metadata) ? source.metadata : {};

  return {
    metadata: {
      ...metadataSource,
      gameId: typeof metadataSource.gameId === 'string' ? metadataSource.gameId : gameId,
      schemaVersion: typeof metadataSource.schemaVersion === 'number' ? metadataSource.schemaVersion : 1,
    },
    layout: {
      defaultPlayerCount: document.defaultPlayerCount,
      presets: cloneRecord(document.presets),
    },
    gameplay: cloneRecord(document.gameplay),
    extensions: cloneRecord(document.extensions),
  };
}

export function resolveLayoutPreset(
  document: NormalizedCardGameLayoutDocument,
  playerCount: number,
): LayoutPreset | null {
  const exact = document.presets[String(playerCount)];
  if (exact) {
    return clonePreset(exact);
  }

  const fallback = document.presets[String(document.defaultPlayerCount)];
  if (fallback) {
    return clonePreset(fallback);
  }

  return null;
}

function isInlineLayoutSource(value: unknown): value is LooseRecord {
  if (!isRecord(value)) {
    return false;
  }

  if (hasLayoutDocumentFields(value)) {
    return true;
  }

  const nestedData = Reflect.get(value, 'data');
  return isRecord(nestedData);
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
