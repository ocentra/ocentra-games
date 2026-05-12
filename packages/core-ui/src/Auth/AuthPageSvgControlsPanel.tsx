import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  AUTH_PAGE_SVG_BOOLEAN_FIELDS,
  AUTH_PAGE_SVG_COLOR_FIELDS,
  AUTH_PAGE_SVG_NUMBER_FIELDS,
  AUTH_PAGE_SVG_TEXT_FIELDS,
  DEFAULT_AUTH_PAGE_SVG_CONTROLS,
  normalizeAuthPageSvgControls,
  type AuthPageSvgControlGroup,
  type AuthPageSvgControls,
} from './CyberAuthSurface';

type AuthPageSvgControlsPanelProps = {
  title?: string;
  description?: string;
  controls: AuthPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<AuthPageSvgControls>>;
  onSave?: (controls: AuthPageSvgControls) => Promise<string | void> | string | void;
};

const groups: AuthPageSvgControlGroup[] = [
  'fit',
  'frame',
  'inset',
  'rails',
  'auth',
  'brand',
  'fields',
  'cta',
  'social',
  'decor',
  'dock',
  'close',
  'colors',
];

const groupLabels: Record<AuthPageSvgControlGroup, string> = {
  fit: 'Fit',
  frame: 'Frame',
  inset: 'Frame Inset',
  rails: 'Side Rails',
  auth: 'Auth Header',
  brand: 'Brand Header',
  fields: 'Form Fields',
  cta: 'Action CTA',
  social: 'Social Login',
  decor: 'Frame Decor',
  dock: 'Bottom Dock',
  close: 'Close Tab',
  colors: 'All Colors',
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
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.5rem, 5.5rem) 2.1rem',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const colorControlsStyle: CSSProperties = {
  ...fieldControlsStyle,
  gridTemplateColumns: '2.5rem minmax(5.5rem, 1fr) 2.1rem',
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

const resetButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  width: '2.1rem',
  height: '2.1rem',
  padding: 0,
  borderRadius: '0.375rem',
  display: 'grid',
  placeItems: 'center',
  lineHeight: 1,
};

const subTabButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  padding: '0.4rem 0.65rem',
  borderRadius: '999px',
  fontSize: '0.7rem',
};

function getControlSection(group: AuthPageSvgControlGroup, key: keyof AuthPageSvgControls): string {
  const name = String(key);
  if (group === 'colors') {
    if (name.startsWith('outline') || name.startsWith('outerGlow') || name.startsWith('bevel')) return 'Frame';
    if (name.startsWith('inset')) return 'Inset';
    if (name.startsWith('sideRail')) return 'Rails';
    if (name.startsWith('auth')) return 'Auth';
    if (name.startsWith('mode')) return 'Mode Buttons';
    if (name.startsWith('avatar')) return 'Avatar';
    if (name.startsWith('field') || name.startsWith('forgot')) return 'Fields';
    if (name.startsWith('cta')) return 'CTA';
    if (name.startsWith('continue')) return 'Divider';
    if (name.startsWith('social')) return 'Social';
    if (name.startsWith('decor')) return 'Decor';
    if (name.startsWith('bottomDock')) return 'Dock';
    if (name.startsWith('close')) return 'Close';
    return 'Other';
  }
  if (group === 'fit') {
    if (name.startsWith('preview')) return 'Preview';
    if (name.startsWith('canvas')) return 'Canvas';
    return 'Scale and Fit';
  }
  if (group === 'frame') {
    if (name.includes('Notch') || name === 'frameW' || name === 'frameH' || name === 'chamfer' || name === 'lockSideNotches') return 'Outer Shape';
    if (name.startsWith('dropShadow')) return 'Drop Shadow';
    return 'Stroke and Depth';
  }
  if (group === 'inset') {
    if (name.includes('Rim') || name === 'insetGap' || name === 'insetStrokeW') return 'Rim';
    if (name.includes('Panel')) return 'Inner Panel';
    return 'Inset Shape';
  }
  if (group === 'rails') {
    if (name.startsWith('upper')) return 'Upper Rail';
    if (name.startsWith('lower')) return 'Lower Rail';
    return 'Shared Rail';
  }
  if (group === 'auth') {
    if (name.startsWith('title') || name.startsWith('subtitle') || name === 'helperSize') return 'Title Copy';
    if (name.startsWith('mode')) return 'Mode Buttons';
    return 'Auth Block';
  }
  if (group === 'brand') {
    if (name.includes('Logo')) return 'Logo';
    if (name.includes('Orb')) return 'Orb';
    if (name.includes('Text') || name.includes('Letter') || name === 'brandGap') return 'Brand Text';
    return 'Plate';
  }
  if (group === 'fields') {
    if (name.startsWith('avatar')) return 'Avatar';
    if (name.includes('Icon') || name.includes('Divider') || name === 'fieldTextX' || name === 'fieldTextSize') return 'Field Children';
    if (name.startsWith('field') && /field[1-4]Y/.test(name)) return 'Field Offsets';
    if (name.startsWith('forgot')) return 'Forgot Link';
    return 'Field Frame';
  }
  if (group === 'cta') {
    if (name.includes('Lock') || name === 'ctaIconBoxW') return 'Lock Icon';
    if (name.includes('Text') || name.includes('Letter')) return 'Text';
    if (name.includes('Edge') || name.includes('Glow')) return 'Edge and Glow';
    if (name.includes('Tick')) return 'Side Ticks';
    return 'Button Frame';
  }
  if (group === 'social') {
    if (name.startsWith('continue')) return 'Divider';
    if (name.startsWith('socialPanel') || name.startsWith('socialChild')) return 'Panel';
    return 'Buttons';
  }
  if (group === 'decor') {
    if (name.startsWith('outerGlow') || name === 'decorGlow') return 'Glow';
    if (name.startsWith('corner')) return 'Corner Lights';
    if (name.startsWith('sidePanel')) return 'Grey Panels';
    if (name.startsWith('screw')) return 'Screws';
    if (name.startsWith('green')) return 'Green Nodes';
    return 'Details';
  }
  if (group === 'dock') {
    if (name.includes('Panel')) return 'Inner Panel';
    if (name.includes('Vent')) return 'Vents';
    return 'Dock Shape';
  }
  if (group === 'close') {
    if (name.includes('Text')) return 'X Mark';
    return 'Corner Tab';
  }
  return 'General';
}

function uniqueSections(fields: Array<{ key: keyof AuthPageSvgControls }>, group: AuthPageSvgControlGroup): string[] {
  return fields.reduce<string[]>((sections, field) => {
    const section = getControlSection(group, field.key);
    return sections.includes(section) ? sections : [...sections, section];
  }, []);
}

function getColorFieldGroups(key: keyof AuthPageSvgControls): Array<Exclude<AuthPageSvgControlGroup, 'colors'>> {
  const name = String(key);
  if (name.startsWith('outline') || name.startsWith('outerGlow') || name.startsWith('bevel')) return ['frame'];
  if (name.startsWith('inset')) return ['inset'];
  if (name.startsWith('sideRail')) return ['rails'];
  if (name.startsWith('mode')) return ['auth'];
  if (name.startsWith('avatar')) return ['fields'];
  if (name.startsWith('field') || name.startsWith('forgot')) return ['fields'];
  if (name.startsWith('cta')) return name === 'ctaOuterStroke' || name === 'ctaDarkStroke' ? ['brand', 'cta'] : ['cta'];
  if (name.startsWith('continue') || name.startsWith('social')) return ['social'];
  if (name.startsWith('decor')) return ['decor'];
  if (name.startsWith('bottomDock')) return ['dock'];
  if (name.startsWith('close')) return ['close'];
  if (name === 'authCyan') return ['auth', 'brand', 'fields', 'cta', 'social'];
  if (name === 'authBlue' || name === 'authGreen') return ['auth', 'cta', 'social'];
  if (name === 'authText' || name === 'authMuted') return ['auth', 'brand', 'fields', 'cta'];
  if (name === 'authStroke') return ['auth', 'fields', 'social'];
  return ['auth'];
}

export function AuthPageSvgControlsPanel({
  title = 'Auth Layout Controls',
  description = 'Tune the shared SVG login surface. The form fields remain real DOM controls inside the SVG frame.',
  controls,
  onControlsChange,
  onSave,
}: AuthPageSvgControlsPanelProps) {
  const [activeGroup, setActiveGroup] = useState<AuthPageSvgControlGroup>('fit');
  const [activeSections, setActiveSections] = useState<Partial<Record<AuthPageSvgControlGroup, string>>>({});
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const normalizedControls = useMemo(() => normalizeAuthPageSvgControls(controls), [controls]);

  const groupBooleanFields = activeGroup === 'colors' ? [] : AUTH_PAGE_SVG_BOOLEAN_FIELDS[activeGroup];
  const groupTextFields = activeGroup === 'colors' ? [] : AUTH_PAGE_SVG_TEXT_FIELDS[activeGroup];
  const groupNumberFields = activeGroup === 'colors' ? [] : AUTH_PAGE_SVG_NUMBER_FIELDS[activeGroup];
  const groupColorFields = activeGroup === 'colors'
    ? AUTH_PAGE_SVG_COLOR_FIELDS
    : AUTH_PAGE_SVG_COLOR_FIELDS.filter(field => getColorFieldGroups(field.key).includes(activeGroup));
  const sectionFields = activeGroup === 'colors'
    ? groupColorFields
    : [...groupBooleanFields, ...groupTextFields, ...groupNumberFields, ...groupColorFields];
  const sections = activeGroup === 'fit' ? ['Fit'] : uniqueSections(sectionFields, activeGroup);
  const activeSection = sections.includes(activeSections[activeGroup] ?? '')
    ? activeSections[activeGroup] ?? sections[0] ?? 'General'
    : sections[0] ?? 'General';
  const visibleBooleanFields = activeGroup === 'fit'
    ? groupBooleanFields
    : groupBooleanFields.filter(field => getControlSection(activeGroup, field.key) === activeSection);
  const visibleTextFields = activeGroup === 'fit'
    ? groupTextFields
    : groupTextFields.filter(field => getControlSection(activeGroup, field.key) === activeSection);
  const visibleNumberFields = activeGroup === 'fit'
    ? groupNumberFields
    : groupNumberFields.filter(field => getControlSection(activeGroup, field.key) === activeSection);
  const visibleColorFields = activeGroup === 'fit'
    ? groupColorFields
    : groupColorFields.filter(field => getControlSection(activeGroup, field.key) === activeSection);

  const updateValue = (key: keyof AuthPageSvgControls, value: string | number | boolean) => {
    onControlsChange(previous => normalizeAuthPageSvgControls({
      ...previous,
      [key]: value,
    }));
  };

  const resetValue = (key: keyof AuthPageSvgControls) => {
    updateValue(key, DEFAULT_AUTH_PAGE_SVG_CONTROLS[key]);
  };

  const renderResetButton = (key: keyof AuthPageSvgControls, label: string) => (
    <button
      type="button"
      style={resetButtonStyle}
      onClick={() => resetValue(key)}
      aria-label={`Reset ${label}`}
      title={`Reset ${label}`}
    >
      ↺
    </button>
  );

  const resetSection = () => {
    onControlsChange(previous => {
      const next = { ...previous };
      [...visibleColorFields, ...visibleBooleanFields, ...visibleTextFields, ...visibleNumberFields].forEach(field => {
        next[field.key] = DEFAULT_AUTH_PAGE_SVG_CONTROLS[field.key] as never;
      });
      return normalizeAuthPageSvgControls(next);
    });
  };

  const resetAll = () => {
    onControlsChange(DEFAULT_AUTH_PAGE_SVG_CONTROLS);
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
              {isSaving ? 'Saving' : 'Save + Sync'}
            </button>
          ) : null}
        </div>
      </header>

      <nav style={tabRowStyle} aria-label="Auth layout control groups">
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

      {sections.length > 1 ? (
        <nav style={tabRowStyle} aria-label={`${groupLabels[activeGroup]} control sections`}>
          {sections.map(section => (
            <button
              key={`${activeGroup}.${section}`}
              type="button"
              style={{
                ...subTabButtonStyle,
                background: activeSection === section ? 'rgba(34, 211, 238, 0.24)' : subTabButtonStyle.background,
                borderColor: activeSection === section ? 'rgba(103, 232, 249, 0.75)' : 'rgba(103, 232, 249, 0.35)',
                color: activeSection === section ? '#ecfeff' : subTabButtonStyle.color,
              }}
              onClick={() => setActiveSections(previous => ({ ...previous, [activeGroup]: section }))}
            >
              {section}
            </button>
          ))}
        </nav>
      ) : null}

      <div style={gridStyle}>
        {activeGroup === 'colors'
          ? visibleColorFields.map(field => (
              <div key={String(field.key)} style={fieldStyle}>
                <span style={labelStyle}>{field.label}</span>
                <span style={colorControlsStyle}>
                  <input
                    type="color"
                    aria-label={field.label}
                    value={String(normalizedControls[field.key])}
                    onChange={event => updateValue(field.key, event.target.value)}
                    style={{ ...inputStyle, padding: '0.2rem', height: '2.1rem' }}
                  />
                  <input
                    type="text"
                    aria-label={`${field.label} value`}
                    value={String(normalizedControls[field.key])}
                    onChange={event => updateValue(field.key, event.target.value)}
                    style={inputStyle}
                  />
                  {renderResetButton(field.key, field.label)}
                </span>
              </div>
            ))
          : (
              <>
                {visibleColorFields.map(field => (
                  <div key={`${activeGroup}.${String(field.key)}.color`} style={fieldStyle}>
                    <span style={labelStyle}>{field.label}</span>
                    <span style={colorControlsStyle}>
                      <input
                        type="color"
                        aria-label={field.label}
                        value={String(normalizedControls[field.key])}
                        onChange={event => updateValue(field.key, event.target.value)}
                        style={{ ...inputStyle, padding: '0.2rem', height: '2.1rem' }}
                      />
                      <input
                        type="text"
                        aria-label={`${field.label} value`}
                        value={String(normalizedControls[field.key])}
                        onChange={event => updateValue(field.key, event.target.value)}
                        style={inputStyle}
                      />
                      {renderResetButton(field.key, field.label)}
                    </span>
                  </div>
                ))}
                {visibleBooleanFields.map(field => (
                  <div key={`${field.group}.${String(field.key)}`} style={{ ...fieldStyle, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto 2.1rem', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={labelStyle}>{field.label}</span>
                    <input
                      type="checkbox"
                      aria-label={field.label}
                      checked={Boolean(normalizedControls[field.key])}
                      onChange={event => updateValue(field.key, event.target.checked)}
                    />
                    {renderResetButton(field.key, field.label)}
                  </div>
                ))}
                {visibleTextFields.map(field => (
                  <div key={`${field.group}.${String(field.key)}`} style={fieldStyle}>
                    <span style={labelStyle}>{field.label}</span>
                    <span style={{ ...fieldControlsStyle, gridTemplateColumns: 'minmax(0, 1fr) 2.1rem' }}>
                      <input
                        type="text"
                        aria-label={field.label}
                        value={String(normalizedControls[field.key])}
                        onChange={event => updateValue(field.key, event.target.value)}
                        style={inputStyle}
                      />
                      {renderResetButton(field.key, field.label)}
                    </span>
                  </div>
                ))}
                {visibleNumberFields.map(field => (
                  <div key={`${field.group}.${String(field.key)}`} style={fieldStyle}>
                    <span style={labelStyle}>{field.label}</span>
                    <span style={fieldControlsStyle}>
                      <input
                        type="range"
                        aria-label={field.label}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={Number(normalizedControls[field.key])}
                        onChange={event => updateValue(field.key, Number(event.target.value))}
                      />
                      <input
                        type="number"
                        aria-label={`${field.label} value`}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={Number(normalizedControls[field.key])}
                        onChange={event => updateValue(field.key, Number(event.target.value))}
                        style={inputStyle}
                      />
                      {renderResetButton(field.key, field.label)}
                    </span>
                  </div>
                ))}
              </>
            )}
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem', overflowWrap: 'anywhere' }}>{status}</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" style={buttonBaseStyle} onClick={resetSection}>Reset Section</button>
          <button type="button" style={{ ...buttonBaseStyle, borderColor: 'rgba(248, 113, 113, 0.5)', color: '#fecaca' }} onClick={resetAll}>Reset All</button>
        </span>
      </footer>
    </section>
  );
}
