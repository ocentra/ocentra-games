import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
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

  const handleSave = async () => {
    if (!onSave) return;
    const result = await onSave(normalizeLeaderboardPageSvgControls(controls));
    setSaveState(typeof result === 'string' && result ? result : 'Saved leaderboard layout controls.');
  };

  return (
    <div className="shop-page-controls-panel">
      <header className="shop-page-controls-panel__header">
        <div>
          <h2>Leaderboard Layout Controls</h2>
          <p>Production leaderboard surface controls stored on PageLayout assets.</p>
        </div>
        {onSave ? (
          <button type="button" className="shop-page-controls-panel__save" onClick={handleSave}>
            Save + Sync
          </button>
        ) : null}
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
              <label key={field.key} className="shop-page-controls-panel__color-row">
                <span>{field.label}</span>
                <input
                  type="color"
                  value={controls.colors[field.key]}
                  onChange={event => updateColor(field.key, event.target.value)}
                />
                <code>{controls.colors[field.key]}</code>
              </label>
            ))}
          </div>
        ) : (
          <div className="shop-page-controls-panel__grid">
            {numberFields.map(field => (
              <label key={`${field.group}.${field.key}`} className="shop-page-controls-panel__range-row">
                <span>{field.label}</span>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(controls[field.group][field.key as keyof typeof controls[typeof field.group]])}
                  onChange={event => updateNumber(field, Number(event.target.value))}
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(controls[field.group][field.key as keyof typeof controls[typeof field.group]])}
                  onChange={event => updateNumber(field, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        )}
      </section>
      {saveState ? <p className="shop-page-controls-panel__status">{saveState}</p> : null}
    </div>
  );
}
