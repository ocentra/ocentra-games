import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS,
  LEADERBOARD_PAGE_SVG_COLOR_FIELDS,
  LEADERBOARD_PAGE_SVG_NUMBER_FIELDS,
  normalizeLeaderboardPageSvgControls,
  type LeaderboardPageSvgControls,
  type LeaderboardPageSvgNumberField,
} from './LeaderboardPageSvgSurfaceControls';

type LeaderboardPageSvgControlsPanelProps = {
  controls: LeaderboardPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<LeaderboardPageSvgControls>>;
  onSave?: (controls: LeaderboardPageSvgControls) => Promise<string | void> | string | void;
};

const groupLabels: Record<LeaderboardPageSvgNumberField['group'] | 'colors', string> = {
  canvas: 'Canvas',
  layout: 'Layout',
  chrome: 'Chrome',
  colors: 'Colors',
};

function updateNestedNumber(
  controls: LeaderboardPageSvgControls,
  field: LeaderboardPageSvgNumberField,
  value: number,
): LeaderboardPageSvgControls {
  return normalizeLeaderboardPageSvgControls({
    ...controls,
    [field.group]: {
      ...controls[field.group],
      [field.key]: value,
    },
  });
}

function readNumberControl(
  controls: LeaderboardPageSvgControls,
  field: LeaderboardPageSvgNumberField,
  fallback: number,
): number {
  const group = controls[field.group] as Record<string, number>;
  const value = group[field.key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function LeaderboardPageSvgControlsPanel({
  controls,
  onControlsChange,
  onSave,
}: LeaderboardPageSvgControlsPanelProps) {
  const [activeGroup, setActiveGroup] = useState<LeaderboardPageSvgNumberField['group'] | 'colors'>('layout');
  const [saveState, setSaveState] = useState('');
  const numberFields = useMemo(
    () => LEADERBOARD_PAGE_SVG_NUMBER_FIELDS.filter(field => field.group === activeGroup),
    [activeGroup],
  );
  const normalizedControls = useMemo(() => normalizeLeaderboardPageSvgControls(controls), [controls]);

  const updateNumber = (field: LeaderboardPageSvgNumberField, value: number) => {
    onControlsChange(current => updateNestedNumber(current, field, value));
  };

  const updateColor = (key: keyof LeaderboardPageSvgControls['colors'], value: string) => {
    onControlsChange(current => normalizeLeaderboardPageSvgControls({
      ...current,
      colors: {
        ...current.colors,
        [key]: value,
      },
    }));
  };

  const resetNumber = (field: LeaderboardPageSvgNumberField) => {
    updateNumber(field, readNumberControl(DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS, field, field.min));
    setSaveState(`Reset ${field.label}.`);
  };

  const resetColor = (key: keyof LeaderboardPageSvgControls['colors'], label: string) => {
    updateColor(key, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors[key]);
    setSaveState(`Reset ${label}.`);
  };

  const resetActiveGroup = () => {
    onControlsChange(current => normalizeLeaderboardPageSvgControls({
      ...current,
      [activeGroup]: { ...DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS[activeGroup] },
    }));
    setSaveState(`Reset ${groupLabels[activeGroup]}.`);
  };

  const resetAll = () => {
    onControlsChange(DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS);
    setSaveState('Reset all leaderboard layout controls.');
  };

  const handleCopy = async () => {
    const value = JSON.stringify(normalizedControls, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      setSaveState('Copied leaderboard layout JSON.');
      return;
    }
    setSaveState(value);
  };

  const handleSave = async () => {
    if (!onSave) return;
    const result = await onSave(normalizedControls);
    setSaveState(typeof result === 'string' && result ? result : 'Saved leaderboard layout controls.');
  };

  return (
    <div className="shop-page-controls-panel">
      <header className="shop-page-controls-panel__header">
        <div>
          <h2>Leaderboard Layout Controls</h2>
          <p>Production leaderboard surface controls stored on PageLayout assets.</p>
        </div>
        <div className="shop-page-controls-panel__header-actions">
          <button type="button" className="shop-page-controls-panel__button" onClick={handleCopy}>
            Copy JSON
          </button>
          {onSave ? (
            <button type="button" className="shop-page-controls-panel__save" onClick={handleSave}>
              Save + Sync
            </button>
          ) : null}
        </div>
      </header>
      <nav className="shop-page-controls-panel__nav" aria-label="Leaderboard control groups">
        {(['layout', 'chrome', 'canvas', 'colors'] as const).map(group => (
          <button
            key={group}
            type="button"
            className={activeGroup === group ? 'is-active' : undefined}
            onClick={() => setActiveGroup(group)}
          >
            {groupLabels[group]}
          </button>
        ))}
      </nav>
      <section className="shop-page-controls-panel__body">
        {activeGroup === 'colors' ? (
          <div className="shop-page-controls-panel__grid">
            {LEADERBOARD_PAGE_SVG_COLOR_FIELDS.map(field => (
              <div key={field.key} className="shop-page-controls-panel__color-row shop-page-controls-panel__field-card">
                <span className="shop-page-controls-panel__field-title">
                  <span>{field.label}</span>
                  <button
                    type="button"
                    className="shop-page-controls-panel__reset"
                    onClick={() => resetColor(field.key, field.label)}
                    aria-label={`Reset ${field.label}`}
                    title={`Reset ${field.label}`}
                  >
                    Reset
                  </button>
                </span>
                <span className="shop-page-controls-panel__field-controls">
                  <input
                    type="color"
                    aria-label={field.label}
                    value={normalizedControls.colors[field.key]}
                    onChange={event => updateColor(field.key, event.target.value)}
                  />
                  <code>{normalizedControls.colors[field.key]}</code>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="shop-page-controls-panel__grid">
            {numberFields.map(field => {
              const value = readNumberControl(normalizedControls, field, field.min);
              return (
                <div key={`${field.group}.${field.key}`} className="shop-page-controls-panel__range-row shop-page-controls-panel__field-card">
                  <span className="shop-page-controls-panel__field-title">
                    <span>{field.label}</span>
                    <button
                      type="button"
                      className="shop-page-controls-panel__reset"
                      onClick={() => resetNumber(field)}
                      aria-label={`Reset ${field.label}`}
                      title={`Reset ${field.label}`}
                    >
                      Reset
                    </button>
                  </span>
                  <span className="shop-page-controls-panel__field-controls">
                    <input
                      type="range"
                      aria-label={field.label}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value}
                      onChange={event => updateNumber(field, Number(event.target.value))}
                    />
                    <input
                      type="number"
                      aria-label={field.label}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value}
                      onChange={event => updateNumber(field, Number(event.target.value))}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <footer className="shop-page-controls-panel__footer">
        <button type="button" className="shop-page-controls-panel__button" onClick={resetActiveGroup}>
          Reset Tab
        </button>
        <button type="button" className="shop-page-controls-panel__button shop-page-controls-panel__button--danger" onClick={resetAll}>
          Reset All
        </button>
      </footer>
      {saveState ? <p className="shop-page-controls-panel__status">{saveState}</p> : null}
    </div>
  );
}
