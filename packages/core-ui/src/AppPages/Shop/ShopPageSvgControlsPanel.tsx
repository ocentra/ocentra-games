import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_SHOP_PAGE_SVG_CONTROLS,
  SHOP_PAGE_SVG_COLOR_FIELDS,
  SHOP_PAGE_SVG_NUMBER_FIELDS,
  normalizeShopPageSvgControls,
  type ShopPageSvgControlGroup,
  type ShopPageSvgControls,
} from './ShopPageSvgSurfaceControls';

type ShopPageSvgControlsPanelProps = {
  title?: string;
  description?: string;
  controls: ShopPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<ShopPageSvgControls>>;
  onSave?: (controls: ShopPageSvgControls) => Promise<string | void> | string | void;
};

const groups: ShopPageSvgControlGroup[] = [
  'canvas',
  'layout',
  'header',
  'leftPanel',
  'mainBody',
  'rightPanel',
  'bottomPreview',
  'footer',
  'primitives',
  'componentTokens',
  'svgDefaults',
  'iconTokens',
  'colors',
];

const groupLabels: Record<ShopPageSvgControlGroup, string> = {
  canvas: 'Canvas',
  layout: 'Layout',
  header: 'Header',
  leftPanel: 'Left',
  mainBody: 'Main',
  rightPanel: 'Right',
  bottomPreview: 'Preview',
  footer: 'Footer',
  primitives: 'Primitives',
  componentTokens: 'Fine Tune',
  svgDefaults: 'SVG',
  iconTokens: 'Icons',
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

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : undefined
  ), source);
}

function writePath(source: Record<string, unknown>, path: string, value: unknown) {
  const [head, ...rest] = path.split('.');
  if (!head) return;
  if (rest.length === 0) {
    source[head] = value;
    return;
  }
  const child = source[head] && typeof source[head] === 'object' && !Array.isArray(source[head])
    ? { ...(source[head] as Record<string, unknown>) }
    : {};
  source[head] = child;
  writePath(child, rest.join('.'), value);
}

export function ShopPageSvgControlsPanel({
  title = 'Shop Layout Controls',
  description = 'Tune the shared shop SVG surface used by the main shop page and asset editor preview.',
  controls,
  onControlsChange,
  onSave,
}: ShopPageSvgControlsPanelProps) {
  const [activeGroup, setActiveGroup] = useState<ShopPageSvgControlGroup>('layout');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const normalizedControls = useMemo(() => normalizeShopPageSvgControls(controls), [controls]);

  const updateNumber = (
    group: Exclude<ShopPageSvgControlGroup, 'colors'>,
    key: string,
    value: number,
  ) => {
    onControlsChange((previous) => {
      const nextGroup = { ...(previous[group] as Record<string, unknown>) };
      writePath(nextGroup, key, value);
      return normalizeShopPageSvgControls({
        ...previous,
        [group]: nextGroup,
      });
    });
  };

  const updateColor = (key: keyof ShopPageSvgControls['colors'], value: string) => {
    onControlsChange(previous => normalizeShopPageSvgControls({
      ...previous,
      colors: {
        ...previous.colors,
        [key]: value,
      },
    }));
  };

  const resetGroup = () => {
    onControlsChange(previous => normalizeShopPageSvgControls({
      ...previous,
      [activeGroup]: DEFAULT_SHOP_PAGE_SVG_CONTROLS[activeGroup],
    }));
  };

  const resetAll = () => {
    onControlsChange(DEFAULT_SHOP_PAGE_SVG_CONTROLS);
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

      <nav style={tabRowStyle} aria-label="Shop layout control groups">
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
          ? SHOP_PAGE_SVG_COLOR_FIELDS.map(field => (
              <label key={field.key} style={fieldStyle}>
                <span style={labelStyle}>{field.label}</span>
                <span style={colorControlsStyle}>
                  <input
                    type="color"
                    value={normalizedControls.colors[field.key].startsWith('#') ? normalizedControls.colors[field.key] : '#54e2ff'}
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
          : SHOP_PAGE_SVG_NUMBER_FIELDS[activeGroup].map(field => (
              <label key={`${field.group}.${field.key}`} style={fieldStyle}>
                <span style={labelStyle}>{field.label}</span>
                <span style={fieldControlsStyle}>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={Number(readPath(normalizedControls[field.group], field.key) ?? field.min)}
                    onChange={event => updateNumber(field.group, field.key, Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    value={Number(readPath(normalizedControls[field.group], field.key) ?? field.min)}
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
