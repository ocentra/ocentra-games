import type { SeatLayout, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { GameAsset, LayoutPreset, TableLayoutState } from './tableLayoutTypes';

const cloneSeats = (seats: SeatLayout[] = []): SeatLayout[] =>
  seats.map((seat) => ({
    ...seat,
    position: seat.position ? { ...seat.position } : { x: 0.5, y: 0.5 },
    playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
  }));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const adjustSeatsForTableChange = (
  prevTable: TableShapeSettings | undefined,
  nextTable: TableShapeSettings,
  seats: SeatLayout[],
): SeatLayout[] => {
  if (!prevTable) {
    return seats;
  }
  const prevWidth = prevTable.width ?? nextTable.width;
  const prevHeight = prevTable.height ?? nextTable.height;
  const nextWidth = nextTable.width ?? prevWidth;
  const nextHeight = nextTable.height ?? prevHeight;

  if (!prevWidth || !prevHeight || !nextWidth || !nextHeight) {
    return seats;
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
      ...seat,
      position: {
        x: clamp01(scaledX),
        y: clamp01(scaledY),
      },
    };
  });
};

const DEFAULT_PLAYER_COUNT = 4;
const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 10;

const clampPlayerCount = (value: number) =>
  Math.min(MAX_PLAYER_COUNT, Math.max(MIN_PLAYER_COUNT, Math.round(value)));

const EMPTY_STATE: TableLayoutState = {
  playerCount: DEFAULT_PLAYER_COUNT,
  table: {},
  seats: [],
  selectedSeatId: null,
  isEditorVisible: false,
  gameId: null,
  asset: null,
};

type Listener = (state: TableLayoutState) => void;

let gameAsset: GameAsset | null = null;
let currentGameId: string | null = null;
let state: TableLayoutState = { ...EMPTY_STATE };
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => listener(state));
};

const updateAssetPreset = (playerCount: number, updates: Partial<LayoutPreset>) => {
  if (!gameAsset) {
    return;
  }
  const key = String(playerCount);
  const existing = gameAsset.layout.presets[key];
  if (!existing) {
    return;
  }

  const nextPreset: LayoutPreset = {
    table: {
      ...(existing.table ?? {}),
      ...(updates.table ?? {}),
    },
    seats: updates.seats ? cloneSeats(updates.seats) : existing.seats,
  };

  gameAsset = {
    ...gameAsset,
    layout: {
      ...gameAsset.layout,
      presets: {
        ...gameAsset.layout.presets,
        [key]: nextPreset,
      },
    },
    metadata: {
      ...gameAsset.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
};

const selectSeatId = (seats: SeatLayout[]): number | null =>
  seats.length > 0 ? seats[0].id : null;

export const tableLayoutStore = {
  getState(): TableLayoutState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /**
   * Replace the entire store payload.
   */
  setLayout(next: Partial<TableLayoutState>): void {
    const nextPlayerCount =
      typeof next.playerCount === 'number'
        ? clampPlayerCount(next.playerCount)
        : state.playerCount;
    const mergedTable = {
      ...state.table,
      ...(next.table ?? {}),
    };
    const incomingSeats = next.seats ? cloneSeats(next.seats) : cloneSeats(state.seats);
    let selectedSeatId =
      'selectedSeatId' in next ? next.selectedSeatId ?? null : state.selectedSeatId ?? null;
    if (selectedSeatId && !incomingSeats.some((seat) => seat.id === selectedSeatId)) {
      selectedSeatId = incomingSeats[0]?.id ?? null;
    }

    const isEditorVisible =
      'isEditorVisible' in next && typeof next.isEditorVisible === 'boolean'
        ? next.isEditorVisible
        : state.isEditorVisible;

    const gameId =
      typeof next.gameId === 'string' ? next.gameId : state.gameId;

    updateAssetPreset(nextPlayerCount, {
      table: mergedTable,
      seats: incomingSeats,
    });

    state = {
      ...state,
      playerCount: nextPlayerCount,
      table: mergedTable,
      seats: incomingSeats,
      selectedSeatId,
      isEditorVisible,
      gameId,
      asset: gameAsset,
    };
    notify();
  },
  setTable(table: TableShapeSettings): void {
    const prevTable = state.table;
    const nextTable: TableShapeSettings = {
      ...prevTable,
      ...table,
    };

    let nextSeats = state.seats;
    if (state.seats.length > 0 && (table.width || table.height || table.offsetX || table.offsetY)) {
      nextSeats = adjustSeatsForTableChange(prevTable, nextTable, cloneSeats(state.seats));
    }

    updateAssetPreset(state.playerCount, { table: nextTable, seats: nextSeats });

    state = {
      ...state,
      table: nextTable,
      seats: nextSeats,
      asset: gameAsset,
    };
    notify();
  },
  setSeats(seats: SeatLayout[]): void {
    const clonedSeats = cloneSeats(seats);
    let selectedSeatId = state.selectedSeatId;
    if (selectedSeatId && !clonedSeats.some((seat) => seat.id === selectedSeatId)) {
      selectedSeatId = clonedSeats[0]?.id ?? null;
    }

    updateAssetPreset(state.playerCount, { seats: clonedSeats });

    state = {
      ...state,
      seats: clonedSeats,
      selectedSeatId,
      asset: gameAsset,
    };
    notify();
  },
  setPlayerCount(playerCount: number): void {
    if (Number.isNaN(playerCount)) return;
    const clamped = clampPlayerCount(playerCount);
    tableLayoutStore.applyPreset(clamped);
  },
  reset(): void {
    state = { ...EMPTY_STATE, asset: gameAsset };
    if (gameAsset) {
      tableLayoutStore.applyPreset(gameAsset.layout.defaultPlayerCount ?? DEFAULT_PLAYER_COUNT);
      return;
    }
    notify();
  },
  applyPreset(playerCount: number): void {
    const clamped = clampPlayerCount(playerCount);
    if (!gameAsset) {
      state = {
        ...state,
        playerCount: clamped,
        asset: gameAsset,
      };
      notify();
      return;
    }
    const preset = gameAsset.layout.presets[String(clamped)];
    if (!preset) {
      return;
    }
    const baseSeats = preset.seats ? cloneSeats(preset.seats) : [];
    state = {
      playerCount: clamped,
      table: { ...(preset.table ?? {}) },
      seats: baseSeats,
      selectedSeatId: selectSeatId(preset.seats ?? []),
      isEditorVisible: state.isEditorVisible,
      gameId: currentGameId,
      asset: gameAsset,
    };
    notify();
  },
  setSelectedSeat(seatId: number | null): void {
    state = {
      ...state,
      selectedSeatId: seatId,
      asset: gameAsset,
    };
    notify();
  },
  setEditorVisible(visible: boolean): void {
    state = {
      ...state,
      isEditorVisible: visible,
      asset: gameAsset,
    };
    notify();
  },
  toggleEditorVisible(): void {
    state = {
      ...state,
      isEditorVisible: !state.isEditorVisible,
      asset: gameAsset,
    };
    notify();
  },
};

export const useTableLayoutSnapshot = (
  subscribe: (listener: Listener) => () => void,
  getState: () => TableLayoutState,
) => {
  return {
    subscribe,
    getState,
  };
};

export function setGameAsset(asset: GameAsset): void {
  const clonedViews = asset.layout.views
    ? Object.fromEntries(
        Object.entries(asset.layout.views).map(([name, preset]) => [
          name,
          {
            table: { ...(preset.table ?? {}) },
            seats: cloneSeats(preset.seats ?? []),
          },
        ]),
      )
    : undefined;

  gameAsset = {
    ...asset,
    layout: {
      ...asset.layout,
      presets: Object.fromEntries(
        Object.entries(asset.layout.presets).map(([count, preset]) => [
          count,
          {
            table: { ...(preset.table ?? {}) },
            seats: cloneSeats(preset.seats ?? []),
          },
        ]),
      ),
      playerUiDefaults: asset.layout.playerUiDefaults
        ? { ...asset.layout.playerUiDefaults }
        : undefined,
      views: clonedViews,
    },
  };
  currentGameId = gameAsset.metadata.gameId ?? null;

  const desiredCount = gameAsset.layout.presets[String(state.playerCount)]
    ? state.playerCount
    : gameAsset.layout.defaultPlayerCount ?? DEFAULT_PLAYER_COUNT;

  tableLayoutStore.applyPreset(desiredCount);
}

export function getGameAsset(): GameAsset | null {
  return gameAsset;
}

