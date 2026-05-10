import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  LOBBY_PAGE_SVG_COLOR_FIELDS,
  LOBBY_PAGE_SVG_NUMBER_FIELDS,
  normalizeLobbyPageSvgControls,
  type LobbyPageSvgControlGroup,
  type LobbyPageSvgControls,
} from './LobbyPageSvgSurfaceControls';

type LobbyPageSvgControlsPanelProps = {
  title?: string;
  description?: string;
  controls: LobbyPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<LobbyPageSvgControls>>;
  onSave?: (controls: LobbyPageSvgControls) => Promise<string | void> | string | void;
};

const groups: LobbyPageSvgControlGroup[] = [
  'layout',
  'header',
  'leftPanel',
  'mainBody',
  'rightPanel',
  'spinner',
  'colors',
];

const groupLabels: Record<LobbyPageSvgControlGroup, string> = {
  layout: 'Layout',
  header: 'Header',
  leftPanel: 'Left',
  mainBody: 'Main',
  rightPanel: 'Right',
  spinner: 'Spinner',
  colors: 'Colors',
};

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  border: '1px solid rgba(103, 232, 249, 0.34)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.95)',
  padding: '1rem',
  color: '#fff',
  boxShadow: '0 1.25rem 2rem rgba(0, 0, 0, 0.35)',
  boxSizing: 'border-box',
  minWidth: 0,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap',
};

const tabRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(16rem, 100%), 1fr))',
  gap: '0.75rem',
  minWidth: 0,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '0.45rem',
  border: '1px solid rgba(103, 232, 249, 0.16)',
  borderRadius: '0.5rem',
  background: 'rgba(0, 0, 0, 0.22)',
  padding: '0.5rem',
  fontSize: '0.75rem',
  minWidth: 0,
};

const fieldControlsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.5rem, 5.5rem)',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const colorControlsStyle: CSSProperties = {
  ...fieldControlsStyle,
  gridTemplateColumns: '2.5rem minmax(5.5rem, 1fr)',
};

const labelStyle: CSSProperties = {
  color: '#ecfeff',
  overflowWrap: 'anywhere',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: '1px solid rgba(103, 232, 249, 0.35)',
  borderRadius: '0.375rem',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#cffafe',
  padding: '0.35rem 0.45rem',
  boxSizing: 'border-box',
};

const buttonBaseStyle: CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.35)',
  borderRadius: '0.5rem',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#cffafe',
  padding: '0.5rem 0.75rem',
  fontWeight: 800,
  fontSize: '0.75rem',
  cursor: 'pointer',
};

export function LobbyPageSvgControlsPanel({
  title = 'Lobby Layout Controls',
  description = 'Tune the shared lobby SVG surface used by the asset editor preview and main lobby page.',
  controls,
  onControlsChange,
  onSave,
}: LobbyPageSvgControlsPanelProps) {
  const [activeGroup, setActiveGroup] = useState<LobbyPageSvgControlGroup>('layout');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const normalizedControls = useMemo(() => normalizeLobbyPageSvgControls(controls), [controls]);

  const updateNumber = (
    group: Exclude<LobbyPageSvgControlGroup, 'colors'>,
    key: string,
    value: number,
  ) => {
    onControlsChange(previous => normalizeLobbyPageSvgControls({
      ...previous,
      [group]: {
        ...previous[group],
        [key]: value,
      },
    }));
  };

  const updateColor = (key: keyof LobbyPageSvgControls['colors'], value: string) => {
    onControlsChange(previous => normalizeLobbyPageSvgControls({
      ...previous,
      colors: {
        ...previous.colors,
        [key]: value,
      },
    }));
  };

  const resetGroup = () => {
    onControlsChange(previous => normalizeLobbyPageSvgControls({
      ...previous,
      [activeGroup]: DEFAULT_LOBBY_PAGE_SVG_CONTROLS[activeGroup],
    }));
  };

  const resetAll = () => {
    onControlsChange(DEFAULT_LOBBY_PAGE_SVG_CONTROLS);
  };

  const handleCopy = async () => {
    const value = JSON.stringify(normalizedControls, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      setStatus('Copied');
      return;
    }
    setStatus(value);
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    setStatus('Saving...');
    try {
      const result = await onSave(normalizedControls);
      setStatus(result || 'Saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#cffafe' }}>{title}</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" style={buttonBaseStyle} onClick={handleCopy}>Copy JSON</button>
          {onSave ? (
            <button
              type="button"
              style={{ ...buttonBaseStyle, background: isSaving ? 'rgba(20, 83, 45, 0.55)' : 'rgba(5, 150, 105, 0.78)' }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving' : 'Save'}
            </button>
          ) : null}
        </div>
      </header>

      <nav style={tabRowStyle} aria-label="Lobby layout control groups">
        {groups.map(group => (
          <button
            key={group}
            type="button"
            style={{
              ...buttonBaseStyle,
              background: activeGroup === group ? 'rgba(103, 232, 249, 0.9)' : buttonBaseStyle.background,
              color: activeGroup === group ? '#020617' : buttonBaseStyle.color,
            }}
            onClick={() => setActiveGroup(group)}
          >
            {groupLabels[group]}
          </button>
        ))}
      </nav>

      <div style={gridStyle}>
        {activeGroup === 'colors'
          ? LOBBY_PAGE_SVG_COLOR_FIELDS.map(field => (
              <label key={field.key} style={fieldStyle}>
                <span style={labelStyle}>{field.label}</span>
                <span style={colorControlsStyle}>
                  <input
                    type="color"
                    value={normalizedControls.colors[field.key]}
                    onChange={event => updateColor(field.key, event.target.value)}
                    style={{ ...inputStyle, padding: '0.2rem', height: '2.1rem' }}
                  />
                  <input
                    type="text"
                    value={normalizedControls.colors[field.key]}
                    onChange={event => updateColor(field.key, event.target.value)}
                    style={inputStyle}
                  />
                </span>
              </label>
            ))
          : LOBBY_PAGE_SVG_NUMBER_FIELDS[activeGroup].map(field => (
              <label key={`${field.group}.${field.key}`} style={fieldStyle}>
                <span style={labelStyle}>{field.label}</span>
                <span style={fieldControlsStyle}>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={normalizedControls[field.group][field.key as keyof typeof normalizedControls[typeof field.group]]}
                    onChange={event => updateNumber(field.group, field.key, Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={normalizedControls[field.group][field.key as keyof typeof normalizedControls[typeof field.group]]}
                    onChange={event => updateNumber(field.group, field.key, Number(event.target.value))}
                    style={inputStyle}
                  />
                </span>
              </label>
            ))}
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem', overflowWrap: 'anywhere' }}>{status}</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" style={buttonBaseStyle} onClick={resetGroup}>Reset Tab</button>
          <button type="button" style={{ ...buttonBaseStyle, borderColor: 'rgba(248, 113, 113, 0.5)', color: '#fecaca' }} onClick={resetAll}>Reset All</button>
        </span>
      </footer>
    </section>
  );
}
