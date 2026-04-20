import React, { useEffect, useMemo, useState } from 'react';
import type {
  CardGameLayoutDocument,
  CardFanControls,
  CardVisualControls,
  HudArtworkControls,
  LayoutPreset,
  PlayerUiDefaults,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import { CardGamePreviewSurface } from './CardGamePreviewSurface';
import { cloneCardGameLayoutDocument, createLayoutPreset } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import './CardGameDesignStudioWorkbench.css';

export interface CardGameDesignStudioWorkbenchProps {
  document: CardGameLayoutDocument;
  title?: string;
  onChange: (document: CardGameLayoutDocument) => void;
  onSave?: () => void | Promise<void>;
  onOpenPreviewCanvas?: () => void;
  activePlayerCount?: number;
  onActivePlayerCountChange?: (count: number) => void;
  embedded?: boolean;
}

const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 10;

type WorkspaceTab = 'hudButtons' | 'hudTuning' | 'table' | 'cardVisuals' | 'cardInHand' | 'layers';

const WORKSPACE_TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: 'layers', label: 'Layer Split' },
  { key: 'hudButtons', label: 'HUD Button Editor' },
  { key: 'hudTuning', label: 'HUD Tuning' },
  { key: 'table', label: 'Table' },
  { key: 'cardVisuals', label: 'Card Visuals' },
  { key: 'cardInHand', label: 'Card in Hand' },
];

const clampPlayerCount = (value: number): number =>
  Math.min(MAX_PLAYER_COUNT, Math.max(MIN_PLAYER_COUNT, Math.round(value)));

const cloneSeat = (seat: SeatLayout): SeatLayout => ({
  ...seat,
  position: { ...seat.position },
  playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
});

const clonePreset = (preset: LayoutPreset): LayoutPreset => ({
  table: { ...preset.table },
  seats: preset.seats.map((seat) => cloneSeat(seat)),
});

const ensurePreset = (document: CardGameLayoutDocument, playerCount: number): CardGameLayoutDocument => {
  const next = cloneCardGameLayoutDocument(document);
  const key = String(playerCount);
  if (!next.presets[key]) {
    next.presets[key] = createLayoutPreset(playerCount);
  }
  return next;
};

const updatePreset = (
  document: CardGameLayoutDocument,
  playerCount: number,
  updater: (preset: LayoutPreset) => LayoutPreset,
): CardGameLayoutDocument => {
  const next = ensurePreset(document, playerCount);
  next.presets[String(playerCount)] = updater(
    clonePreset(next.presets[String(playerCount)] ?? createLayoutPreset(playerCount)),
  );
  return next;
};

function numberValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? 'card-game-design-studio__tab card-game-design-studio__tab--active' : 'card-game-design-studio__tab'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="card-game-design-studio__field">
      <span>{label}</span>
      <div className="card-game-design-studio__field-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="card-game-design-studio__field">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export const CardGameDesignStudioWorkbench: React.FC<CardGameDesignStudioWorkbenchProps> = ({
  document,
  title,
  onChange,
  onSave,
  onOpenPreviewCanvas,
  activePlayerCount,
  onActivePlayerCountChange,
  embedded = false,
}) => {
  const [draft, setDraft] = useState<CardGameLayoutDocument>(() => cloneCardGameLayoutDocument(document));
  const [internalActivePlayerCount, setInternalActivePlayerCount] = useState<number>(document.defaultPlayerCount);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('layers');

  useEffect(() => {
    setDraft(cloneCardGameLayoutDocument(document));
    setInternalActivePlayerCount(document.defaultPlayerCount);
  }, [document]);

  const resolvedActivePlayerCount = activePlayerCount ?? internalActivePlayerCount;
  const activePreset = useMemo(
    () =>
      draft.presets[String(resolvedActivePlayerCount)] ??
      draft.presets[String(draft.defaultPlayerCount)] ??
      createLayoutPreset(resolvedActivePlayerCount),
    [draft, resolvedActivePlayerCount],
  );

  const commit = (next: CardGameLayoutDocument) => {
    setDraft(next);
    onChange(next);
  };

  const setDefaultPlayerCount = (value: number) => {
    const nextCount = clampPlayerCount(value);
    const next = ensurePreset(draft, nextCount);
    next.defaultPlayerCount = nextCount;
    commit(next);
    if (onActivePlayerCountChange) {
      onActivePlayerCountChange(nextCount);
    } else {
      setInternalActivePlayerCount(nextCount);
    }
  };

  const setTableField = (field: keyof TableShapeSettings, value: string) => {
    const next = updatePreset(draft, resolvedActivePlayerCount, (preset) => ({
      ...preset,
      table: {
        ...preset.table,
        [field]: numberValue(value),
      },
    }));
    commit(next);
  };

  const setSeatField = (seatId: number, field: 'label' | 'x' | 'y' | 'rotation' | 'scale', value: string) => {
    const next = updatePreset(draft, resolvedActivePlayerCount, (preset) => ({
      ...preset,
      seats: preset.seats.map((seat) => {
        if (seat.id !== seatId) {
          return seat;
        }

        if (field === 'label') {
          return {
            ...seat,
            label: value,
          };
        }

        if (field === 'x' || field === 'y') {
          return {
            ...seat,
            position: {
              ...seat.position,
              [field]: Math.max(0, Math.min(1, numberValue(value))),
            },
          };
        }

        return {
          ...seat,
          [field]: numberValue(value),
        } as SeatLayout;
      }),
    }));
    commit(next);
  };

  const setPlayerUiDefaults = (updater: (current: Partial<PlayerUiDefaults>) => Partial<PlayerUiDefaults>) => {
    const next = cloneCardGameLayoutDocument(draft);
    next.playerUiDefaults = updater({ ...(next.playerUiDefaults ?? {}) });
    commit(next);
  };

  const setHud = (updater: (current: HudArtworkControls) => HudArtworkControls) => {
    const next = cloneCardGameLayoutDocument(draft);
    next.hud = updater({ ...next.hud });
    commit(next);
  };

  const setCardFan = (updater: (current: CardFanControls) => CardFanControls) => {
    const next = cloneCardGameLayoutDocument(draft);
    next.cardFan = updater({ ...next.cardFan });
    commit(next);
  };

  const setCardVisuals = (updater: (current: CardVisualControls) => CardVisualControls) => {
    const next = cloneCardGameLayoutDocument(draft);
    next.cardVisuals = updater({ ...next.cardVisuals });
    commit(next);
  };

  const save = async () => {
    await onSave?.();
  };

  return (
    <div className={embedded ? 'card-game-design-studio card-game-design-studio--embedded' : 'card-game-design-studio'}>
      {!embedded ? (
        <>
          <div className="card-game-design-studio__background">
            <CardGamePreviewSurface
              document={draft}
              playerCount={resolvedActivePlayerCount}
              className="card-game-design-studio__background-surface"
            />
          </div>

          <div className="card-game-design-studio__veil" />

          <header className="card-game-design-studio__header">
            <div>
              <h1>{title ?? 'Card Game Design Studio'}</h1>
              <p>Live layout editor for the saved template asset.</p>
            </div>
            <div className="card-game-design-studio__actions">
              {onOpenPreviewCanvas ? (
                <button type="button" onClick={onOpenPreviewCanvas}>
                  Open Preview Canvas
                </button>
              ) : null}
              {onSave ? (
                <button type="button" onClick={save}>
                  Save
                </button>
              ) : null}
            </div>
          </header>
        </>
      ) : null}

      <main className="card-game-design-studio__shell">
        <div className="card-game-design-studio__tabs" role="tablist" aria-label="Editor sections">
          {WORKSPACE_TABS.map((tab) => (
            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        <div className="card-game-design-studio__content">
          {activeTab === 'layers' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>Layer Split</h2>
                <p>Authoring controls for the shared layout asset.</p>
              </div>
              <div className="card-game-design-studio__grid card-game-design-studio__grid--compact">
                <label className="card-game-design-studio__field">
                  <span>Default Players</span>
                  <input
                    type="number"
                    min={MIN_PLAYER_COUNT}
                    max={MAX_PLAYER_COUNT}
                    value={draft.defaultPlayerCount}
                    onChange={(event) => setDefaultPlayerCount(Number(event.target.value))}
                  />
                </label>
                <label className="card-game-design-studio__field">
                  <span>Active Preset</span>
                  <select
                    value={resolvedActivePlayerCount}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (onActivePlayerCountChange) {
                        onActivePlayerCountChange(next);
                      } else {
                        setInternalActivePlayerCount(next);
                      }
                    }}
                  >
                    {Array.from({ length: MAX_PLAYER_COUNT - MIN_PLAYER_COUNT + 1 }, (_, index) => MIN_PLAYER_COUNT + index).map((count) => (
                      <option key={count} value={count}>
                        {count} players
                      </option>
                    ))}
                  </select>
                </label>
                <div className="card-game-design-studio__preview-card">
                  <div className="card-game-design-studio__preview-card-title">Table Preview</div>
                  <div className="card-game-design-studio__mini-preview">
                    <CardGamePreviewSurface document={draft} playerCount={resolvedActivePlayerCount} />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'table' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>Table</h2>
                <p>Shape and seat placement for the active preset.</p>
              </div>
              <div className="card-game-design-studio__grid">
                <div className="card-game-design-studio__panel">
                  <h3>Table Shape</h3>
                  <div className="card-game-design-studio__field-grid">
                    {(['width', 'height', 'offsetX', 'offsetY', 'curvature', 'feltInset'] as Array<keyof TableShapeSettings>).map((field) => (
                      <label key={field} className="card-game-design-studio__field">
                        <span>{field}</span>
                        <input
                          type="number"
                          step={field === 'curvature' ? '0.01' : '1'}
                          value={Number(activePreset.table[field] ?? 0)}
                          onChange={(event) => setTableField(field, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card-game-design-studio__panel">
                  <h3>Seats</h3>
                  <div className="card-game-design-studio__seat-list">
                    {activePreset.seats.map((seat) => (
                      <div key={seat.id} className="card-game-design-studio__seat-card">
                        <strong>{seat.label ?? `p${seat.id + 1}`}</strong>
                        <div className="card-game-design-studio__seat-grid">
                          <label className="card-game-design-studio__field">
                            <span>label</span>
                            <input
                              type="text"
                              value={seat.label ?? ''}
                              onChange={(event) => setSeatField(seat.id, 'label', event.target.value)}
                            />
                          </label>
                          <label className="card-game-design-studio__field">
                            <span>x</span>
                            <input
                              type="number"
                              step="0.01"
                              value={seat.position.x}
                              onChange={(event) => setSeatField(seat.id, 'x', event.target.value)}
                            />
                          </label>
                          <label className="card-game-design-studio__field">
                            <span>y</span>
                            <input
                              type="number"
                              step="0.01"
                              value={seat.position.y}
                              onChange={(event) => setSeatField(seat.id, 'y', event.target.value)}
                            />
                          </label>
                          <label className="card-game-design-studio__field">
                            <span>rotation</span>
                            <input
                              type="number"
                              step="1"
                              value={seat.rotation ?? 0}
                              onChange={(event) => setSeatField(seat.id, 'rotation', event.target.value)}
                            />
                          </label>
                          <label className="card-game-design-studio__field">
                            <span>scale</span>
                            <input
                              type="number"
                              step="0.01"
                              value={seat.scale ?? 0.5}
                              onChange={(event) => setSeatField(seat.id, 'scale', event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'hudButtons' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>HUD Button Editor</h2>
                <p>Shared HUD button layout and labels.</p>
              </div>
              <div className="card-game-design-studio__grid">
                <div className="card-game-design-studio__panel">
                  <h3>Layout</h3>
                  <div className="card-game-design-studio__field-grid">
                    <NumberField
                      label="Button Scale"
                      value={draft.hud.buttonScale}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                      onChange={(next) => setHud((current) => ({ ...current, buttonScale: next }))}
                    />
                    <NumberField
                      label="Button Count"
                      value={draft.hud.buttonCount}
                      min={1}
                      max={6}
                      step={1}
                      onChange={(next) => setHud((current) => ({ ...current, buttonCount: next }))}
                    />
                    <NumberField
                      label="Button Offset X"
                      value={draft.hud.button.buttonOffsetX ?? 0}
                      min={-200}
                      max={200}
                      step={1}
                      onChange={(next) =>
                        setHud((current) => ({
                          ...current,
                          button: {
                            ...current.button,
                            buttonOffsetX: next,
                          },
                        }))
                      }
                    />
                    <NumberField
                      label="Button Offset Y"
                      value={draft.hud.button.buttonOffsetY ?? 0}
                      min={-200}
                      max={200}
                      step={1}
                      onChange={(next) =>
                        setHud((current) => ({
                          ...current,
                          button: {
                            ...current.button,
                            buttonOffsetY: next,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="card-game-design-studio__panel">
                  <h3>Labels</h3>
                  <div className="card-game-design-studio__labels-grid">
                    {draft.hud.buttonLabels.slice(0, 6).map((label, index) => (
                      <label key={index} className="card-game-design-studio__field">
                        <span>{String.fromCharCode(65 + index)}</span>
                        <input
                          type="text"
                          value={label}
                          onChange={(event) =>
                            setHud((current) => {
                              const nextLabels = [...current.buttonLabels];
                              nextLabels[index] = event.target.value;
                              return {
                                ...current,
                                buttonLabels: nextLabels,
                              };
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'hudTuning' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>HUD Tuning</h2>
                <p>Wing, dome, and player UI settings for the template shell.</p>
              </div>
              <div className="card-game-design-studio__grid">
                <div className="card-game-design-studio__panel">
                  <h3>HUD</h3>
                  <div className="card-game-design-studio__field-grid">
                    <NumberField
                      label="HUD Offset X"
                      value={draft.hud.hudOffsetX}
                      min={-200}
                      max={200}
                      step={1}
                      onChange={(next) => setHud((current) => ({ ...current, hudOffsetX: next }))}
                    />
                    <NumberField
                      label="HUD Offset Y"
                      value={draft.hud.hudOffsetY}
                      min={-200}
                      max={200}
                      step={1}
                      onChange={(next) => setHud((current) => ({ ...current, hudOffsetY: next }))}
                    />
                    <NumberField
                      label="Overall Scale"
                      value={draft.hud.overallScale}
                      min={0.25}
                      max={2}
                      step={0.01}
                      onChange={(next) => setHud((current) => ({ ...current, overallScale: next }))}
                    />
                    <NumberField
                      label="Panel Glass"
                      value={draft.hud.panelGlassOpacity}
                      min={0}
                      max={0.6}
                      step={0.01}
                      onChange={(next) => setHud((current) => ({ ...current, panelGlassOpacity: next }))}
                    />
                  </div>
                </div>

                <div className="card-game-design-studio__panel">
                  <h3>Player UI Defaults</h3>
                  <div className="card-game-design-studio__field-grid">
                    <NumberField
                      label="Label Offset"
                      value={draft.playerUiDefaults.labelTextOffset ?? 550}
                      min={0}
                      max={1000}
                      step={1}
                      onChange={(next) =>
                        setPlayerUiDefaults((current) => ({ ...current, labelTextOffset: next }))
                      }
                    />
                    <NumberField
                      label="Avatar Scale"
                      value={draft.playerUiDefaults.avatarImageScale ?? 1.2}
                      min={0.1}
                      max={4}
                      step={0.01}
                      onChange={(next) =>
                        setPlayerUiDefaults((current) => ({ ...current, avatarImageScale: next }))
                      }
                    />
                    <ColorField
                      label="Avatar Base"
                      value={draft.playerUiDefaults.avatarBaseColor ?? '#f0f0f0'}
                      onChange={(next) => setPlayerUiDefaults((current) => ({ ...current, avatarBaseColor: next }))}
                    />
                    <ColorField
                      label="Info Box"
                      value={draft.playerUiDefaults.infoBoxColor ?? '#003c78'}
                      onChange={(next) => setPlayerUiDefaults((current) => ({ ...current, infoBoxColor: next }))}
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'cardVisuals' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>Card Visuals</h2>
                <p>Float scale and table card presentation.</p>
              </div>
              <div className="card-game-design-studio__panel">
                <NumberField
                  label="Float Scale"
                  value={draft.cardVisuals.floatScale}
                  min={0.25}
                  max={8}
                  step={0.25}
                  onChange={(next) => setCardVisuals((current) => ({ ...current, floatScale: next }))}
                />
              </div>
            </section>
          ) : null}

          {activeTab === 'cardInHand' ? (
            <section className="card-game-design-studio__section">
              <div className="card-game-design-studio__section-header">
                <h2>Card in Hand</h2>
                <p>Use the live template preview to verify hand position and fan shape.</p>
              </div>
              <div className="card-game-design-studio__panel">
                <div className="card-game-design-studio__field-grid">
                  <NumberField
                    label="Card Count"
                    value={draft.cardFan.cardCount}
                    min={draft.cardFan.minCardCount}
                    max={draft.cardFan.maxCardCount}
                    step={1}
                    onChange={(next) => setCardFan((current) => ({ ...current, cardCount: next }))}
                  />
                  <NumberField
                    label="Radius Scale"
                    value={draft.cardFan.radiusScale}
                    min={0.1}
                    max={2}
                    step={0.01}
                    onChange={(next) => setCardFan((current) => ({ ...current, radiusScale: next }))}
                  />
                  <NumberField
                    label="Fan Tilt"
                    value={draft.cardFan.fanTilt}
                    min={-90}
                    max={90}
                    step={1}
                    onChange={(next) => setCardFan((current) => ({ ...current, fanTilt: next }))}
                  />
                  <NumberField
                    label="Width Scale"
                    value={draft.cardFan.cardWidthScale}
                    min={0.25}
                    max={1}
                    step={0.01}
                    onChange={(next) => setCardFan((current) => ({ ...current, cardWidthScale: next }))}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
};
