import type {
  CardFanControls,
  CardGameLayoutDocument,
  CardGameLayerVisibility,
  CardVisualControls,
  HudArtworkControls,
  HudButtonControls,
  LayoutPreset,
  PlayerUiDefaults,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout, SerializablePlayerUIKey, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';

export interface CardGameLayoutMetadata {
  gameId: string;
  schemaVersion: number;
  displayName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardGameLayoutAsset {
  metadata: CardGameLayoutMetadata;
  layout: CardGameLayoutDocument;
  gameplay: Record<string, unknown>;
  extensions: Record<string, unknown>;
}

export interface TableLayoutState {
  playerCount: number;
  table: TableShapeSettings;
  seats: SeatLayout[];
  selectedSeatId: number | null;
  isEditorVisible: boolean;
  gameId: string | null;
  asset: CardGameLayoutAsset | null;
}

export interface SerializedSeatLayout {
  id: number;
  label?: string;
  position?: {
    x?: number;
    y?: number;
  };
  rotation?: number;
  scale?: number;
  playerOverrides?: Partial<Record<SerializablePlayerUIKey, number>>;
}

export interface SerializedLayoutPreset {
  table?: Partial<TableShapeSettings>;
  seats?: SerializedSeatLayout[];
}

export interface SerializedCardGameLayoutDocument {
  defaultPlayerCount?: number;
  presets?: Record<string, SerializedLayoutPreset>;
  playerUiDefaults?: Partial<PlayerUiDefaults>;
  hud?: Partial<HudArtworkControls>;
  cardFan?: Partial<CardFanControls>;
  cardVisuals?: Partial<CardVisualControls>;
  views?: Record<string, SerializedLayoutPreset>;
  gameplay?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface SerializedCardGameLayoutAsset {
  metadata?: Partial<CardGameLayoutMetadata> & { gameId?: string; schemaVersion?: number };
  layout?: SerializedCardGameLayoutDocument | null;
  gameplay?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export const DEFAULT_PLAYER_COUNT = 4;
export const MIN_PLAYER_COUNT = 2;
export const MAX_PLAYER_COUNT = 10;
export const DEFAULT_SEAT_SCALE = 0.5;

export const DEFAULT_TABLE_SHAPE: TableShapeSettings = {
  width: 960,
  height: 560,
  offsetX: 0,
  offsetY: -78,
  curvature: 0.88,
  feltInset: -8,
};

export const DEFAULT_PLAYER_UI_DEFAULTS: PlayerUiDefaults = {
  baseArcRotation: 0,
  infoBoxAngle: 180,
  infoBoxRotation: 0,
  labelTextOffset: 550,
  avatarImageScale: 1.2,
  avatarBaseColor: 'rgba(240, 240, 240, 1)',
  infoBoxColor: 'rgba(0, 60, 120, 0.9)',
  overallScale: 1,
};

export const DEFAULT_HUD_BUTTON_CONTROLS: HudButtonControls = {
  buttonOffsetX: 0,
  buttonOffsetY: 6,
  width: 649,
  height: 218,
  bodyHeight: 218,
  radius: 109,
  sideInset: 0,
  dotInset: 20,
  dotGap: 15,
  textColor: '#fff7ff',
  fontSize: 72,
  bodyCenter: '#2b064a',
  bodyMid: '#17002a',
  bodyEdge: '#0a0013',
  ringColor: '#ea6bff',
  outerGlowColor: '#9d00ff',
  midGlowColor: '#e25eff',
  dotGlowColor: '#ffca28',
  dotCoreColor: '#fff59d',
  sideFillTop: '#3d0f69',
  sideFillMid: '#21043c',
  sideFillBottom: '#10011f',
  sideStroke: '#eb7aff',
  sideGlow: '#b020ff',
  frontFillTop: '#0f2a66',
  frontFillMid: '#0a1b3f',
  frontFillBottom: '#050d1f',
  hoverInsetExpand: 10,
  hoverClampGlowColor: '#ffd34d',
  hoverClampGlowOpacity: 0.9,
  clickInsetExpand: 14,
  clickRingFlashColor: '#39ff88',
  clickRingFlashOpacity: 0.95,
};

export const DEFAULT_HUD_ARTWORK_CONTROLS: HudArtworkControls = {
  hudOffsetX: 0,
  hudOffsetY: 0,
  overallScale: 1,
  width: 1920,
  height: 250,
  buttonScale: 1,
  buttonCount: 6,
  buttonLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
  button: DEFAULT_HUD_BUTTON_CONTROLS,
  buttonVariants: Array.from({ length: 6 }, () => ({
    linked: true,
    overrides: {},
  })),
  leftWing: {
    x: 4,
    y: 174,
    width: 957,
    height: 76,
    topRadius: 20,
  },
  rightWing: {
    x: 959,
    y: 174,
    width: 957,
    height: 76,
    topRadius: 20,
  },
  clamp: {
    width: 11,
    height: 35,
    rightRadius: 18,
    goldTop: '#fff6bc',
    goldMid: '#d5a623',
    goldBottom: '#7c5407',
  },
  wingStyle: {
    edgeColor: '#22ff66',
    edgeWidth: 1,
    glowColor: '#00ff66',
    glowWidth: 8,
    glowOpacity: 0.34,
  },
  dome: {
    cx: 952,
    cy: 251,
    width: 500,
    height: 500,
    topRadius: 300,
    edgeColor: '#f0cb63',
    edgeInnerColor: '#7f5610',
    edgeWidth: 1,
    glowColor: '#f0cb63',
    glowWidth: 12,
    glowOpacity: 0.22,
  },
  panelTop: '#0b1a10',
  panelMid: '#050b07',
  panelBottom: '#0a1c12',
  panelGlassOpacity: 0.08,
  layerVisibility: {
    background: true,
    header: true,
    table: true,
    seats: true,
    cards: true,
    hud: true,
    tools: true,
    footer: true,
  },
  linkedWings: true,
  showDebugGuides: true,
};

export const DEFAULT_CARD_FAN_CONTROLS: CardFanControls = {
  cardCount: 13,
  minCardCount: 3,
  maxCardCount: 13,
  radiusScale: 0.1,
  radiusOffset: 0,
  cardWidthScale: 0.39,
  arcMin: 34,
  arcMax: 149,
  fanTilt: 0,
  centerOffsetX: 0,
  centerOffsetY: -14,
  overallScale: 1.07,
  disableViewportScale: true,
};

export const DEFAULT_CARD_VISUAL_CONTROLS: CardVisualControls = {
  floatScale: 3,
};

/**
 * Clamps a coordinate value to a reasonable range that allows movement
 * outside the central 1000x1000 arena into the widescreen 'dead zones'.
 */
const clampCoordinate = (value: number) => Math.max(-0.5, Math.min(1.5, value));

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const cloneSeat = (seat: SeatLayout): SeatLayout => ({
  ...seat,
  position: { ...seat.position },
  playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
});

const clonePreset = (preset: LayoutPreset): LayoutPreset => ({
  table: { ...preset.table },
  seats: preset.seats.map((seat) => cloneSeat(seat)),
});

export const seedLayoutPresetFromSource = (
  sourcePreset: LayoutPreset | null | undefined,
  targetCount: number,
): LayoutPreset => {
  const targetPreset = createLayoutPreset(targetCount);
  if (!sourcePreset) {
    return targetPreset;
  }

  const sourceSeatsById = new Map(sourcePreset.seats.map((seat) => [seat.id, seat]));
  return {
    table: { ...targetPreset.table, ...sourcePreset.table },
    seats: targetPreset.seats.map((seat) => {
      const sourceSeat = sourceSeatsById.get(seat.id);
      if (!sourceSeat) {
        return cloneSeat(seat);
      }

      return {
        ...seat,
        label: sourceSeat.label ?? seat.label,
        position: { ...sourceSeat.position },
        rotation: sourceSeat.rotation,
        scale: sourceSeat.scale,
        playerOverrides: sourceSeat.playerOverrides ? { ...sourceSeat.playerOverrides } : undefined,
      };
    }),
  };
};

const cloneHud = (hud: HudArtworkControls): HudArtworkControls => ({
  ...hud,
  buttonLabels: [...hud.buttonLabels],
  button: { ...hud.button },
  buttonVariants: hud.buttonVariants.map((variant) => ({
    linked: variant.linked,
    overrides: { ...variant.overrides },
  })),
  leftWing: { ...hud.leftWing },
  rightWing: { ...hud.rightWing },
  clamp: { ...hud.clamp },
  wingStyle: { ...hud.wingStyle },
  dome: { ...hud.dome },
  layerVisibility: hud.layerVisibility ? { ...hud.layerVisibility } : undefined,
});

const cloneCardFan = (cardFan: CardFanControls): CardFanControls => ({
  ...cardFan,
});

const cloneCardVisuals = (cardVisuals: CardVisualControls): CardVisualControls => ({
  ...cardVisuals,
});

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const generateSeatRing = (count: number): SeatLayout[] => {
  const seats: SeatLayout[] = [];
  const radiusX = 0.38;
  const radiusY = 0.34;
  const angleStep = (2 * Math.PI) / count;
  const baseAngle = Math.PI / 2;

  for (let index = 0; index < count; index += 1) {
    const angle = baseAngle + angleStep * index;
    const x = 0.5 + Math.cos(angle) * radiusX;
    const y = 0.5 + Math.sin(angle) * radiusY;
    seats.push({
      id: index,
      label: `p${index + 1}`,
      position: {
        x: Number(clampCoordinate(x).toFixed(4)),
        y: Number(clampCoordinate(y).toFixed(4)),
      },
      rotation: 0,
      scale: DEFAULT_SEAT_SCALE,
    });
  }

  return seats;
};

export const createLayoutPreset = (count: number): LayoutPreset => ({
  table: { ...DEFAULT_TABLE_SHAPE },
  seats: generateSeatRing(count),
});

export const createDefaultCardGameLayoutDocument = (): CardGameLayoutDocument => {
  const counts = Array.from({ length: 9 }, (_, index) => index + 2);
  const presets = Object.fromEntries(counts.map((count) => [String(count), createLayoutPreset(count)]));

  return {
    defaultPlayerCount: DEFAULT_PLAYER_COUNT,
    presets,
    playerUiDefaults: { ...DEFAULT_PLAYER_UI_DEFAULTS },
    hud: cloneHud(DEFAULT_HUD_ARTWORK_CONTROLS),
    cardFan: cloneCardFan(DEFAULT_CARD_FAN_CONTROLS),
    cardVisuals: cloneCardVisuals(DEFAULT_CARD_VISUAL_CONTROLS),
    views: {},
    gameplay: {},
    extensions: {},
  };
};

const normalizeSeat = (input: SerializedSeatLayout | undefined, fallback?: SeatLayout): SeatLayout => {
  const fallbackSeat = fallback ? cloneSeat(fallback) : undefined;
  const id = Number.isFinite(input?.id) ? Number(input?.id) : fallbackSeat?.id ?? 0;
  const position = {
    x: clampCoordinate(
      Number.isFinite(input?.position?.x) ? Number(input?.position?.x) : fallbackSeat?.position?.x ?? 0.5,
    ),
    y: clampCoordinate(
      Number.isFinite(input?.position?.y) ? Number(input?.position?.y) : fallbackSeat?.position?.y ?? 0.5,
    ),
  };

  const seat: SeatLayout = {
    id,
    label: input?.label ?? fallbackSeat?.label ?? `p${id + 1}`,
    position: {
      x: Number(position.x.toFixed(4)),
      y: Number(position.y.toFixed(4)),
    },
    rotation: Number.isFinite(input?.rotation)
      ? Number(input?.rotation)
      : fallbackSeat?.rotation ?? 0,
    ...(Number.isFinite(input?.scale)
      ? { scale: Number(input?.scale) }
      : fallbackSeat?.scale !== undefined
        ? { scale: fallbackSeat.scale }
        : { scale: DEFAULT_SEAT_SCALE }),
  };

  const overrides: Partial<Record<SerializablePlayerUIKey, number>> = {};
  if (input?.playerOverrides && typeof input.playerOverrides === 'object' && !Array.isArray(input.playerOverrides)) {
    (Object.keys(input.playerOverrides) as SerializablePlayerUIKey[]).forEach((key) => {
      const value = input.playerOverrides?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        overrides[key] = value;
      }
    });
  }

  if (Object.keys(overrides).length > 0) {
    seat.playerOverrides = overrides;
  }

  return seat;
};

export const normalizeLayoutPreset = (
  preset: SerializedLayoutPreset | LayoutPreset | undefined,
  fallback: LayoutPreset,
): LayoutPreset => {
  if (!preset) {
    return clonePreset(fallback);
  }

  const fallbackSeatsById = new Map<number, SeatLayout>();
  fallback.seats.forEach((seat) => {
    fallbackSeatsById.set(seat.id, seat);
  });

  const seats: SeatLayout[] = [];
  const serializedSeats = 'seats' in preset && Array.isArray(preset.seats) ? preset.seats : [];

  serializedSeats.forEach((seatInput) => {
    const fallbackSeat = fallbackSeatsById.get(seatInput.id);
    const normalizedSeat = normalizeSeat(seatInput, fallbackSeat);
    seats.push(normalizedSeat);
    fallbackSeatsById.delete(normalizedSeat.id);
  });

  if (seats.length === 0) {
    seats.push(...fallback.seats.map((seat) => cloneSeat(seat)));
  } else {
    fallbackSeatsById.forEach((seat) => {
      seats.push(cloneSeat(seat));
    });
  }

  seats.sort((a, b) => a.id - b.id);

  const table = 'table' in preset && preset.table
    ? {
        ...fallback.table,
        ...preset.table,
      }
    : { ...fallback.table };

  return {
    table,
    seats,
  };
};

const normalizePlayerUiDefaults = (
  source: Partial<PlayerUiDefaults> | undefined,
  fallback: Partial<PlayerUiDefaults>,
): Partial<PlayerUiDefaults> => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeLayerVisibility = (
  source: CardGameLayerVisibility | undefined,
  fallback: CardGameLayerVisibility | undefined,
): CardGameLayerVisibility => ({
  ...(fallback ?? {}),
  ...(source ?? {}),
});

const normalizeHud = (
  source: Partial<HudArtworkControls> | undefined,
  fallback: HudArtworkControls,
): HudArtworkControls => {
  if (!source) {
    return cloneHud(fallback);
  }

  return {
    ...fallback,
    ...source,
    buttonLabels: source.buttonLabels ? [...source.buttonLabels] : [...fallback.buttonLabels],
    button: {
      ...fallback.button,
      ...(source.button ?? {}),
    },
    buttonVariants: source.buttonVariants
      ? source.buttonVariants.map((variant, index) => ({
          linked: variant.linked ?? fallback.buttonVariants[index]?.linked ?? true,
          overrides: {
            ...fallback.buttonVariants[index]?.overrides,
            ...(variant.overrides ?? {}),
          },
        }))
      : fallback.buttonVariants.map((variant) => ({
          linked: variant.linked,
          overrides: { ...variant.overrides },
        })),
    leftWing: {
      ...fallback.leftWing,
      ...(source.leftWing ?? {}),
    },
    rightWing: {
      ...fallback.rightWing,
      ...(source.rightWing ?? {}),
    },
    clamp: {
      ...fallback.clamp,
      ...(source.clamp ?? {}),
    },
    wingStyle: {
      ...fallback.wingStyle,
      ...(source.wingStyle ?? {}),
    },
    dome: {
      ...fallback.dome,
      ...(source.dome ?? {}),
    },
    layerVisibility: normalizeLayerVisibility(source.layerVisibility, fallback.layerVisibility),
  };
};

const normalizeCardFan = (
  source: Partial<CardFanControls> | undefined,
  fallback: CardFanControls,
): CardFanControls => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeCardVisuals = (
  source: Partial<CardVisualControls> | undefined,
  fallback: CardVisualControls,
): CardVisualControls => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const getLayoutContainer = (source: Record<string, unknown>): Record<string, unknown> => {
  const layout = source.layout;
  if (layout && typeof layout === 'object' && !Array.isArray(layout)) {
    return layout as Record<string, unknown>;
  }
  return source;
};

const isPresetRecord = (value: unknown): value is Record<string, SerializedLayoutPreset> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeCardGameLayoutDocument = (
  source: SerializedCardGameLayoutDocument | Record<string, unknown> | null | undefined,
): CardGameLayoutDocument => {
  const root = normalizeRecord(source);
  const container = getLayoutContainer(root);
  const fallback = createDefaultCardGameLayoutDocument();
  const sourcePresets = isPresetRecord(container.presets) ? container.presets : {};
  const fallbackPresetKeys = Object.keys(fallback.presets);
  const presetKeys = new Set<string>([...fallbackPresetKeys, ...Object.keys(sourcePresets)]);

  const presets = Object.fromEntries(
    Array.from(presetKeys).map((countKey) => {
      const numericCount = Number.parseInt(countKey, 10);
      const fallbackPreset =
        fallback.presets[countKey] ?? createLayoutPreset(Number.isNaN(numericCount) ? fallback.defaultPlayerCount : numericCount);
      const sourcePreset = sourcePresets[countKey];
      return [countKey, normalizeLayoutPreset(sourcePreset, fallbackPreset)];
    }),
  );

  const views = isPresetRecord(container.views)
    ? Object.fromEntries(
        Object.entries(container.views).map(([viewId, presetInput]) => {
          const fallbackView =
            fallback.views[viewId] ??
            createLayoutPreset(fallback.defaultPlayerCount);
          return [viewId, normalizeLayoutPreset(presetInput, fallbackView)];
        }),
      )
    : clone(fallback.views);

  const gameplay = normalizeRecord(container.gameplay);
  const extensions = normalizeRecord(container.extensions);

  return {
    defaultPlayerCount: Number.isFinite(container.defaultPlayerCount)
      ? Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, Math.round(Number(container.defaultPlayerCount))))
      : fallback.defaultPlayerCount,
    presets,
    playerUiDefaults: normalizePlayerUiDefaults(
      container.playerUiDefaults as Partial<PlayerUiDefaults> | undefined,
      fallback.playerUiDefaults,
    ),
    hud: normalizeHud(container.hud as Partial<HudArtworkControls> | undefined, fallback.hud),
    cardFan: normalizeCardFan(container.cardFan as Partial<CardFanControls> | undefined, fallback.cardFan),
    cardVisuals: normalizeCardVisuals(
      container.cardVisuals as Partial<CardVisualControls> | undefined,
      fallback.cardVisuals,
    ),
    views,
    gameplay,
    extensions,
  };
};

export const resolveLayoutPreset = (
  document: CardGameLayoutDocument,
  playerCount: number,
): LayoutPreset => {
  const exact = document.presets[String(playerCount)];
  if (exact) {
    return clonePreset(exact);
  }

  const fallback = document.presets[String(document.defaultPlayerCount)];
  if (fallback) {
    return clonePreset(fallback);
  }

  return createLayoutPreset(playerCount);
};

export const adjustSeatsForTableChange = (
  prevTable: TableShapeSettings | undefined,
  nextTable: TableShapeSettings,
  seats: SeatLayout[],
): SeatLayout[] => {
  if (!prevTable) {
    return seats.map((seat) => cloneSeat(seat));
  }

  const prevWidth = prevTable.width ?? nextTable.width;
  const prevHeight = prevTable.height ?? nextTable.height;
  const nextWidth = nextTable.width ?? prevWidth;
  const nextHeight = nextTable.height ?? prevHeight;

  if (!prevWidth || !prevHeight || !nextWidth || !nextHeight) {
    return seats.map((seat) => cloneSeat(seat));
  }

  const ratioX = nextWidth / prevWidth;
  const ratioY = nextHeight / prevHeight;
  const offsetDeltaX = ((nextTable.offsetX ?? 0) - (prevTable.offsetX ?? 0)) / nextWidth;
  const offsetDeltaY = ((nextTable.offsetY ?? 0) - (prevTable.offsetY ?? 0)) / nextHeight;

  return seats.map((seat) => {
    const currentX = seat.position?.x ?? 0.5;
    const currentY = seat.position?.y ?? 0.5;
    const centeredX = currentX - 0.5;
    const centeredY = currentY - 0.5;

    const scaledX = 0.5 + centeredX * ratioX + offsetDeltaX;
    const scaledY = 0.5 + centeredY * ratioY + offsetDeltaY;

    return {
      ...cloneSeat(seat),
      position: {
        x: clampCoordinate(scaledX),
        y: clampCoordinate(scaledY),
      },
    };
  });
};

export const cloneCardGameLayoutDocument = (document: CardGameLayoutDocument): CardGameLayoutDocument => ({
  defaultPlayerCount: document.defaultPlayerCount,
  presets: Object.fromEntries(
    Object.entries(document.presets).map(([key, preset]) => [key, clonePreset(preset)]),
  ),
  playerUiDefaults: { ...document.playerUiDefaults },
  hud: cloneHud(document.hud),
  cardFan: cloneCardFan(document.cardFan),
  cardVisuals: cloneCardVisuals(document.cardVisuals),
  views: Object.fromEntries(
    Object.entries(document.views).map(([key, preset]) => [key, clonePreset(preset)]),
  ),
  gameplay: clone(document.gameplay),
  extensions: clone(document.extensions),
});

export const hydrateCardGameLayoutAsset = (
  source: SerializedCardGameLayoutAsset | CardGameLayoutAsset | Record<string, unknown> | null | undefined,
  gameId: string,
): CardGameLayoutAsset => {
  const root = normalizeRecord(source);
  const metadataSource = normalizeRecord(root.metadata);
  const layoutSource = normalizeRecord(root.layout);

  return {
    metadata: {
      gameId: typeof metadataSource.gameId === 'string' ? metadataSource.gameId : gameId,
      schemaVersion: Number.isFinite(metadataSource.schemaVersion)
        ? Number(metadataSource.schemaVersion)
        : 1,
      displayName: typeof metadataSource.displayName === 'string' ? metadataSource.displayName : toPascalCase(gameId) || gameId,
      description: typeof metadataSource.description === 'string' ? metadataSource.description : undefined,
      createdAt: typeof metadataSource.createdAt === 'string' ? metadataSource.createdAt : new Date().toISOString(),
      updatedAt: typeof metadataSource.updatedAt === 'string' ? metadataSource.updatedAt : new Date().toISOString(),
    },
    layout: normalizeCardGameLayoutDocument(layoutSource),
    gameplay: normalizeRecord(root.gameplay),
    extensions: normalizeRecord(root.extensions),
  };
};

export const createDefaultCardGameLayoutAsset = (gameId: string): CardGameLayoutAsset => ({
  metadata: {
    gameId,
    schemaVersion: 1,
    displayName: toPascalCase(gameId) || gameId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  layout: createDefaultCardGameLayoutDocument(),
  gameplay: {},
  extensions: {},
});
