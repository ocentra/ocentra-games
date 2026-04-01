import React, { useEffect, useMemo, useState } from 'react';
import type { AssetData } from '@/types/assets';
import type { SeatLayout, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  buildLoadedLayoutAssetFromRaw,
  saveLayoutAsset,
  type LayoutAssetDocument,
} from '@/adapters/layout/LayoutAssetService';
import './CardGameLayoutPreview.css';

interface CardGameLayoutPreviewProps {
  assetPath: string;
  assetData: AssetData;
  onAssetUpdate?: (updatedData: AssetData) => void;
}

const DEFAULT_TABLE: TableShapeSettings = {
  width: 960,
  height: 560,
  offsetX: 0,
  offsetY: -78,
  curvature: 0.88,
  feltInset: -8,
};

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

function cloneDocument(document: LayoutAssetDocument): LayoutAssetDocument {
  return JSON.parse(JSON.stringify(document)) as LayoutAssetDocument;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createSeatRing(count: number): SeatLayout[] {
  const seats: SeatLayout[] = [];
  const radiusX = 0.38;
  const radiusY = 0.34;
  const step = (2 * Math.PI) / count;
  const baseAngle = Math.PI / 2;

  for (let index = 0; index < count; index += 1) {
    const angle = baseAngle + step * index;
    seats.push({
      id: index,
      label: `p${index + 1}`,
      position: {
        x: Number(clamp01(0.5 + Math.cos(angle) * radiusX).toFixed(4)),
        y: Number(clamp01(0.5 + Math.sin(angle) * radiusY).toFixed(4)),
      },
      rotation: 0,
      scale: 0.5,
    });
  }

  return seats;
}

function ensurePreset(document: LayoutAssetDocument, playerCount: number): LayoutAssetDocument {
  const next = cloneDocument(document);
  const key = String(playerCount);
  if (!next.presets[key]) {
    next.presets[key] = {
      table: { ...DEFAULT_TABLE },
      seats: createSeatRing(playerCount),
    };
  }
  return next;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const CardGameLayoutPreview: React.FC<CardGameLayoutPreviewProps> = ({
  assetPath,
  assetData,
  onAssetUpdate,
}) => {
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath]
  );

  const [document, setDocument] = useState<LayoutAssetDocument>(() =>
    ensurePreset(loadedAsset.document, loadedAsset.document.defaultPlayerCount || 4)
  );
  const [activePreset, setActivePreset] = useState<number>(loadedAsset.document.defaultPlayerCount || 4);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextDocument = ensurePreset(loadedAsset.document, loadedAsset.document.defaultPlayerCount || 4);
    setDocument(nextDocument);
    setActivePreset(nextDocument.defaultPlayerCount || 4);
    setSaveMessage(null);
  }, [loadedAsset]);

  const presetKey = String(activePreset);
  const currentPreset = document.presets[presetKey] ?? {
    table: { ...DEFAULT_TABLE },
    seats: createSeatRing(activePreset),
  };
  const currentTable = { ...DEFAULT_TABLE, ...(currentPreset.table ?? {}) };

  const updatePreset = (updater: (preset: { table: TableShapeSettings; seats: SeatLayout[] }) => { table: TableShapeSettings; seats: SeatLayout[] }) => {
    setDocument((current) => {
      const next = ensurePreset(current, activePreset);
      next.presets[presetKey] = updater({
        table: { ...DEFAULT_TABLE, ...(next.presets[presetKey]?.table ?? {}) },
        seats: [...(next.presets[presetKey]?.seats ?? [])],
      });
      return next;
    });
    setSaveMessage(null);
  };

  const handleTableField = (field: keyof TableShapeSettings, value: string) => {
    updatePreset((preset) => ({
      ...preset,
      table: {
        ...preset.table,
        [field]: toNumber(value, Number(preset.table[field] ?? DEFAULT_TABLE[field] ?? 0)),
      },
    }));
  };

  const handleSeatField = (seatId: number, field: 'x' | 'y' | 'rotation' | 'scale', value: string) => {
    updatePreset((preset) => ({
      ...preset,
      seats: preset.seats.map((seat) => {
        if (seat.id !== seatId) {
          return seat;
        }
        if (field === 'x' || field === 'y') {
          return {
            ...seat,
            position: {
              ...seat.position,
              [field]: clamp01(toNumber(value, seat.position[field])),
            },
          };
        }
        return {
          ...seat,
          [field]: toNumber(value, Number(seat[field] ?? 0)),
        };
      }),
    }));
  };

  const handleResetPreset = () => {
    updatePreset(() => ({
      table: { ...DEFAULT_TABLE },
      seats: createSeatRing(activePreset),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const saved = await saveLayoutAsset(loadedAsset, document);
      onAssetUpdate?.(saved.raw as AssetData);
      setSaveMessage('Saved');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card-game-layout-preview">
      <div className="card-game-layout-preview__toolbar">
        <div className="card-game-layout-preview__controls">
          <label>
            Default Players
            <input
              type="number"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={document.defaultPlayerCount}
              onChange={(event) => {
                const nextCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(toNumber(event.target.value, document.defaultPlayerCount))));
                setDocument((current) => ensurePreset({ ...cloneDocument(current), defaultPlayerCount: nextCount }, nextCount));
                setActivePreset(nextCount);
                setSaveMessage(null);
              }}
            />
          </label>
          <label>
            Editing Preset
            <select
              value={activePreset}
              onChange={(event) => {
                const nextCount = Number.parseInt(event.target.value, 10);
                setDocument((current) => ensurePreset(current, nextCount));
                setActivePreset(nextCount);
                setSaveMessage(null);
              }}
            >
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => MIN_PLAYERS + index).map((count) => (
                <option key={count} value={count}>
                  {count} players
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleResetPreset}>
            Reset Preset
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
        {saveMessage && <div className="card-game-layout-preview__status">{saveMessage}</div>}
      </div>

      <div className="card-game-layout-preview__grid">
        <section className="card-game-layout-preview__panel">
          <h4>Table Preview</h4>
          <svg className="card-game-layout-preview__canvas" viewBox="0 0 1000 700" role="img" aria-label="Layout preview">
            <rect x="0" y="0" width="1000" height="700" rx="24" className="card-game-layout-preview__canvas-bg" />
            <ellipse
              cx={500 + (currentTable.offsetX ?? 0)}
              cy={350 + (currentTable.offsetY ?? 0)}
              rx={(currentTable.width ?? 960) / 2}
              ry={(currentTable.height ?? 560) / 2}
              className="card-game-layout-preview__table"
            />
            {currentPreset.seats.map((seat) => (
              <g key={seat.id}>
                <circle
                  cx={120 + seat.position.x * 760}
                  cy={90 + seat.position.y * 520}
                  r={18 + ((seat.scale ?? 0.5) * 12)}
                  className="card-game-layout-preview__seat"
                />
                <text
                  x={120 + seat.position.x * 760}
                  y={95 + seat.position.y * 520}
                  textAnchor="middle"
                  className="card-game-layout-preview__seat-label"
                >
                  {seat.label}
                </text>
              </g>
            ))}
          </svg>
        </section>

        <section className="card-game-layout-preview__panel">
          <h4>Table Shape</h4>
          <div className="card-game-layout-preview__field-grid">
            {(['width', 'height', 'offsetX', 'offsetY', 'curvature', 'feltInset'] as Array<keyof TableShapeSettings>).map((field) => (
              <label key={field}>
                {field}
                <input
                  type="number"
                  step={field === 'curvature' ? '0.01' : '1'}
                  value={Number(currentTable[field] ?? DEFAULT_TABLE[field] ?? 0)}
                  onChange={(event) => handleTableField(field, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="card-game-layout-preview__panel card-game-layout-preview__panel--full">
          <h4>Seats</h4>
          <div className="card-game-layout-preview__seat-list">
            {currentPreset.seats.map((seat) => (
              <div key={seat.id} className="card-game-layout-preview__seat-row">
                <div className="card-game-layout-preview__seat-title">{seat.label}</div>
                <label>
                  X
                  <input
                    type="number"
                    step="0.01"
                    value={seat.position.x}
                    onChange={(event) => handleSeatField(seat.id, 'x', event.target.value)}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    step="0.01"
                    value={seat.position.y}
                    onChange={(event) => handleSeatField(seat.id, 'y', event.target.value)}
                  />
                </label>
                <label>
                  Rotation
                  <input
                    type="number"
                    step="1"
                    value={seat.rotation ?? 0}
                    onChange={(event) => handleSeatField(seat.id, 'rotation', event.target.value)}
                  />
                </label>
                <label>
                  Scale
                  <input
                    type="number"
                    step="0.05"
                    value={seat.scale ?? 0.5}
                    onChange={(event) => handleSeatField(seat.id, 'scale', event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
