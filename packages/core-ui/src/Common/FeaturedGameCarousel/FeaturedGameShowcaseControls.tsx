import React, { memo, useState } from 'react';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  serializeFeaturedShowcaseControls,
  type FeaturedGameShowcasePreviewLayoutMode,
  type FeaturedShowcaseButtonAlign,
  type FeaturedShowcaseControls,
  type FeaturedShowcaseControlTab,
  type FeaturedShowcaseMediaFit,
  type FeaturedShowcaseNumberControlGroup,
} from './FeaturedGameShowcase.types';

type FeaturedGameShowcaseControlsProps = {
  controls: FeaturedShowcaseControls;
  onControlsChange: React.Dispatch<React.SetStateAction<FeaturedShowcaseControls>>;
  onSave?: (controls: FeaturedShowcaseControls) => Promise<string | void> | string | void;
  previewLayoutMode?: FeaturedGameShowcasePreviewLayoutMode;
  onPreviewLayoutModeChange?: (mode: FeaturedGameShowcasePreviewLayoutMode) => void;
  controlScope?: 'featured' | 'comingSoon';
  title?: string;
  description?: string;
  showActions?: boolean;
};

type NumberFieldConfig = {
  group: FeaturedShowcaseNumberControlGroup;
  field: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

type ColorFieldConfig = {
  field: keyof FeaturedShowcaseControls['colors'];
  label: string;
};

type SelectFieldConfig = {
  group: FeaturedShowcaseNumberControlGroup;
  field: string;
  label: string;
  options: { value: string; label: string }[];
};

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const panelStyle: React.CSSProperties = {
  marginTop: '1rem',
  border: '1px solid rgba(103, 232, 249, 0.3)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.95)',
  padding: '1rem',
  color: '#fff',
  boxShadow: '0 1.25rem 2rem rgba(0, 0, 0, 0.35)',
  boxSizing: 'border-box',
  minWidth: 0,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
};

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '0.75rem',
};

const sectionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(15rem, 100%), 1fr))',
  gap: '0.75rem',
  minWidth: 0,
};

const groupStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.2)',
  borderRadius: '0.65rem',
  padding: '0.75rem',
  minWidth: 0,
};

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignItems: 'stretch',
  gap: '0.5rem',
  border: '1px solid rgba(103, 232, 249, 0.16)',
  borderRadius: '0.5rem',
  background: 'rgba(0, 0, 0, 0.22)',
  padding: '0.5rem',
  fontSize: '0.75rem',
  minWidth: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  minWidth: 0,
  color: '#ecfeff',
  overflowWrap: 'anywhere',
};

const fieldControlsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.25rem, 5rem) 2rem',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const colorControlsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2.5rem minmax(5.5rem, 1fr) 2rem',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const alphaControlsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.25rem, 5rem) 2rem',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const toggleControlsStyle: React.CSSProperties = {
  ...fieldControlsStyle,
  gridTemplateColumns: '3rem 2rem',
  justifyContent: 'start',
};

const inputStyle: React.CSSProperties = {
  minWidth: 0,
  height: '1.8rem',
  border: '1px solid rgba(103, 232, 249, 0.3)',
  borderRadius: '0.4rem',
  background: '#020617',
  color: '#ecfeff',
  paddingInline: '0.45rem',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.38)',
  borderRadius: '0.5rem',
  background: 'rgba(8, 47, 73, 0.72)',
  color: '#cffafe',
  padding: '0.5rem 0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const resetButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  height: '1.8rem',
  padding: 0,
  minWidth: 0,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#67e8f9',
  color: '#020617',
};

const copiedButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(22, 163, 74, 0.92)',
  borderColor: 'rgba(134, 239, 172, 0.82)',
  color: '#f0fdf4',
};

function getNumberValue(
  controls: FeaturedShowcaseControls,
  group: FeaturedShowcaseNumberControlGroup,
  field: string,
): number {
  const value = (controls[group] as Record<string, number | boolean | string>)[field];
  return typeof value === 'number' ? value : 0;
}

function getBooleanValue(
  controls: FeaturedShowcaseControls,
  group: FeaturedShowcaseNumberControlGroup,
  field: string,
): boolean {
  const value = (controls[group] as Record<string, number | boolean | string>)[field];
  return typeof value === 'boolean' ? value : false;
}

function getStringValue(
  controls: FeaturedShowcaseControls,
  group: FeaturedShowcaseNumberControlGroup,
  field: string,
): string {
  const value = (controls[group] as Record<string, number | boolean | string>)[field];
  return typeof value === 'string' ? value : '';
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function byteToHex(value: number): string {
  return clampNumber(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function parseColor(value: string): { hex: string; alpha: number } {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) return { hex: `#${hexMatch[1]}`, alpha: 1 };

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => Number(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return {
        hex: `#${byteToHex(parts[0])}${byteToHex(parts[1])}${byteToHex(parts[2])}`,
        alpha: Number.isFinite(parts[3]) ? clampNumber(parts[3], 0, 1) : 1,
      };
    }
  }

  return { hex: '#000000', alpha: 1 };
}

function colorWithHex(value: string, hex: string): string {
  const parsed = parseColor(value);
  if (parsed.alpha >= 0.995) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(parsed.alpha.toFixed(2))})`;
}

function colorWithAlpha(value: string, alpha: number): string {
  const parsed = parseColor(value);
  const r = Number.parseInt(parsed.hex.slice(1, 3), 16);
  const g = Number.parseInt(parsed.hex.slice(3, 5), 16);
  const b = Number.parseInt(parsed.hex.slice(5, 7), 16);
  const nextAlpha = clampNumber(alpha, 0, 1);
  return nextAlpha >= 0.995
    ? parsed.hex
    : `rgba(${r}, ${g}, ${b}, ${Number(nextAlpha.toFixed(2))})`;
}

export const FeaturedGameShowcaseControls = memo(function FeaturedGameShowcaseControls({
  controls,
  onControlsChange,
  onSave,
  previewLayoutMode = 'auto',
  onPreviewLayoutModeChange,
  controlScope = 'featured',
  title = 'Featured Showcase Controls',
  description = 'Shared SVG layout tuning for the homepage featured block.',
  showActions = true,
}: FeaturedGameShowcaseControlsProps) {
  const [tab, setTab] = useState<FeaturedShowcaseControlTab>('overall');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const setNumber = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
    value: number,
  ) => {
    onControlsChange((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const resetNumber = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
  ) => {
    const defaults = DEFAULT_FEATURED_SHOWCASE_CONTROLS[group] as Record<string, number | boolean | string>;
    setNumber(group, field, Number(defaults[field]));
  };

  const setBoolean = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
    value: boolean,
  ) => {
    onControlsChange((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const resetBoolean = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
  ) => {
    const defaults = DEFAULT_FEATURED_SHOWCASE_CONTROLS[group] as Record<string, number | boolean | string>;
    setBoolean(group, field, Boolean(defaults[field]));
  };

  const setString = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
    value: string,
  ) => {
    onControlsChange((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const resetString = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
  ) => {
    const defaults = DEFAULT_FEATURED_SHOWCASE_CONTROLS[group] as Record<string, number | boolean | string>;
    setString(group, field, String(defaults[field] ?? ''));
  };

  const setColor = (field: keyof FeaturedShowcaseControls['colors'], value: string) => {
    onControlsChange((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [field]: value,
      },
    }));
  };

  const resetColor = (field: keyof FeaturedShowcaseControls['colors']) => {
    setColor(field, DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors[field]);
  };

  const getSerializedControls = (): FeaturedShowcaseControls => serializeFeaturedShowcaseControls(controls);

  const getCopyValue = () => JSON.stringify(getSerializedControls(), null, 2);

  const resetGroup = (group: keyof FeaturedShowcaseControls) => {
    onControlsChange((prev) => ({
      ...prev,
      [group]: DEFAULT_FEATURED_SHOWCASE_CONTROLS[group],
    }));
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    setSaveStatus('Saving...');
    try {
      const message = await onSave(getSerializedControls());
      setSaveStatus(typeof message === 'string' && message.length > 0 ? message : 'Saved');
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const value = getCopyValue();
    await copyTextToClipboard(value);
    setCopiedValue(value);
  };

  const numberField = ({ group, field, label, min = -200, max = 2000, step = 1 }: NumberFieldConfig) => {
    const value = getNumberValue(controls, group, field);
    return (
      <label key={`${group}.${field}`} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={fieldControlsStyle}>
          <input
            style={{ minWidth: 0, accentColor: '#67e8f9' }}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => setNumber(group, field, Number(event.target.value))}
          />
          <input
            style={{ ...inputStyle, textAlign: 'right' }}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => setNumber(group, field, Number(event.target.value))}
          />
          <button type="button" title="Reset this control" aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetNumber(group, field)}>
            R
          </button>
        </span>
      </label>
    );
  };

  const colorField = ({ field, label }: ColorFieldConfig) => {
    const parsed = parseColor(controls.colors[field]);
    return (
      <label key={field} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={colorControlsStyle}>
          <input
            type="color"
            value={parsed.hex}
            onChange={(event) => setColor(field, colorWithHex(controls.colors[field], event.target.value))}
            style={{ width: '2.5rem', height: '1.8rem', padding: 0, borderRadius: '0.35rem' }}
          />
          <input
            style={inputStyle}
            value={controls.colors[field]}
            onChange={(event) => setColor(field, event.target.value)}
          />
          <button type="button" title="Reset this color" aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetColor(field)}>
            R
          </button>
        </span>
        <span style={alphaControlsStyle}>
          <input
            style={{ minWidth: 0, accentColor: '#67e8f9' }}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={parsed.alpha}
            onChange={(event) => setColor(field, colorWithAlpha(controls.colors[field], Number(event.target.value)))}
          />
          <input
            style={{ ...inputStyle, textAlign: 'right' }}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={Number(parsed.alpha.toFixed(2))}
            onChange={(event) => setColor(field, colorWithAlpha(controls.colors[field], Number(event.target.value)))}
          />
          <span style={{ color: '#a5f3fc', fontSize: '0.68rem' }}>A</span>
        </span>
      </label>
    );
  };

  const toggleField = (
    group: FeaturedShowcaseNumberControlGroup,
    field: string,
    label: string,
  ) => {
    const value = getBooleanValue(controls, group, field);
    return (
      <label key={`${group}.${field}`} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={toggleControlsStyle}>
          <input
            type="checkbox"
            checked={value}
            onChange={(event) => setBoolean(group, field, event.target.checked)}
          />
          <button type="button" title="Reset this toggle" aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetBoolean(group, field)}>
            R
          </button>
        </span>
      </label>
    );
  };

  const selectField = ({ group, field, label, options }: SelectFieldConfig) => {
    const value = getStringValue(controls, group, field);
    return (
      <label key={`${group}.${field}`} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={fieldControlsStyle}>
          <select
            style={{ ...inputStyle, gridColumn: '1 / span 2' }}
            value={value}
            onChange={(event) => setString(group, field, event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" title="Reset this control" aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetString(group, field)}>
            R
          </button>
        </span>
      </label>
    );
  };

  const renderSection = (title: string, fields: React.ReactNode[]) => (
    <section style={groupStyle}>
      <div style={{ color: '#a5f3fc', fontWeight: 800, marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>{fields}</div>
    </section>
  );

  const previewLayoutField = () => {
    if (!onPreviewLayoutModeChange) return null;
    const modes: { id: FeaturedGameShowcasePreviewLayoutMode; label: string }[] = [
      { id: 'auto', label: 'Auto' },
      { id: 'wide', label: 'Wide' },
      { id: 'narrow', label: 'Narrow' },
    ];
    return (
      <label key="preview-layout-mode" style={fieldStyle}>
        <span style={fieldLabelStyle}>Preview Layout</span>
        <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              style={previewLayoutMode === mode.id ? activeButtonStyle : buttonStyle}
              onClick={() => onPreviewLayoutModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </span>
      </label>
    );
  };

  const tabs: { id: FeaturedShowcaseControlTab; label: string }[] = [
    { id: 'overall', label: 'Overall' },
    { id: 'header', label: 'Header / Tabs' },
    { id: 'body', label: 'Body A|B' },
    { id: 'sideA', label: 'Side A' },
    { id: 'sideB', label: 'Side B' },
    { id: 'footer', label: 'Footer' },
  ];
  const mediaFitOptions: { value: FeaturedShowcaseMediaFit; label: string }[] = [
    { value: 'cover', label: 'Fill / crop' },
    { value: 'contain', label: 'Contain / no crop' },
    { value: 'stretch', label: 'Stretch' },
  ];
  const montageFitOptions: { value: FeaturedShowcaseMediaFit; label: string }[] = [
    { value: 'cover', label: 'Fill / crop' },
    { value: 'stretch', label: 'Stretch' },
  ];
  const buttonAlignOptions: { value: FeaturedShowcaseButtonAlign; label: string }[] = [
    { value: 'start', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'end', label: 'Right' },
  ];
  const isFeaturedScope = controlScope === 'featured';
  const isComingSoonScope = controlScope === 'comingSoon';
  const isCopyCurrent = copiedValue === getCopyValue();

  return (
    <div style={panelStyle} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <div style={headerStyle}>
        <div>
          <div style={{ color: '#cffafe', fontSize: '0.9rem', fontWeight: 900 }}>{title}</div>
          <div style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem' }}>{description}</div>
          <div style={{ color: 'rgba(207, 250, 254, 0.64)', fontSize: '0.72rem', marginTop: '0.25rem' }}>Use Bounds Overlay first. Page Bleed expands past parent padding; Design Width changes SVG coordinate scale, not parent fit.</div>
        </div>
        {showActions ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onSave ? (
              <button type="button" style={{ ...buttonStyle, background: 'rgba(21, 128, 61, 0.72)' }} disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? 'Saving...' : 'Save + Sync'}
              </button>
            ) : null}
            <button type="button" style={isCopyCurrent ? copiedButtonStyle : buttonStyle} onClick={() => void handleCopy()}>
              {isCopyCurrent ? 'Copied' : 'Copy'}
            </button>
            <button type="button" style={buttonStyle} onClick={() => resetGroup(tab === 'overall' ? 'overall' : tab)}>
              Reset Section
            </button>
            <button type="button" style={{ ...buttonStyle, borderColor: 'rgba(251, 113, 133, 0.5)', color: '#fecdd3' }} onClick={() => onControlsChange(DEFAULT_FEATURED_SHOWCASE_CONTROLS)}>
              Reset All
            </button>
          </div>
        ) : null}
      </div>
      {showActions && saveStatus ? (
        <div style={{ color: '#bbf7d0', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          {saveStatus}
        </div>
      ) : null}

      <div style={tabRowStyle}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            style={tab === item.id ? activeButtonStyle : buttonStyle}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overall' ? (
        <div style={sectionGridStyle}>
          {renderSection('Preview', [
            previewLayoutField(),
            toggleField('overall', 'debugBounds', 'Bounds Overlay'),
          ])}
          {renderSection('Outer Canvas', [
            numberField({ group: 'overall', field: 'parentBleedX', label: 'Page Bleed X', min: 0, max: 420 }),
            numberField({ group: 'overall', field: 'canvasInsetX', label: 'Inner Padding X', min: 0, max: 240 }),
            numberField({ group: 'overall', field: 'marginTop', label: 'Top Margin Wide', min: 0, max: 240 }),
            numberField({ group: 'overall', field: 'marginBottom', label: 'Bottom Margin Wide', min: 0, max: 240 }),
            numberField({ group: 'overall', field: 'narrowMarginTop', label: 'Top Margin Narrow', min: 0, max: 360 }),
            numberField({ group: 'overall', field: 'narrowMarginBottom', label: 'Bottom Margin Narrow', min: 0, max: 360 }),
            numberField({ group: 'overall', field: 'viewWidth', label: 'Design Width / Scale', min: 900, max: 2400 }),
            numberField({ group: 'overall', field: 'wideHeight', label: 'Outer Height Wide', min: 420, max: 1800 }),
            numberField({ group: 'overall', field: 'narrowHeight', label: 'Outer Height Narrow', min: 520, max: 2600 }),
            numberField({ group: 'overall', field: 'narrowBreakpoint', label: 'Narrow Breakpoint', min: 0, max: 1600 }),
          ])}
          {renderSection('Stage Box', [
            numberField({ group: 'overall', field: 'stageY', label: 'Stage Top Y', min: 0, max: 200 }),
            numberField({ group: 'overall', field: 'stageWideH', label: 'Stage Height Wide', min: 260, max: 1600 }),
            numberField({ group: 'overall', field: 'stageNarrowH', label: 'Stage Height Narrow', min: 360, max: 2400 }),
            numberField({ group: 'overall', field: 'stageRadius', label: 'Stage Radius', min: 0, max: 60 }),
          ])}
          {renderSection('Arrows', [
            numberField({ group: 'overall', field: 'edgeInset', label: 'Arrow Edge Inset', min: 0, max: 140 }),
            numberField({ group: 'arrows', field: 'width', label: 'Arrow Width', min: 4, max: 260 }),
            numberField({ group: 'arrows', field: 'height', label: 'Arrow Height', min: 16, max: 2400 }),
            numberField({ group: 'arrows', field: 'gap', label: 'Arrow-Stage Gap', min: -40, max: 80 }),
            numberField({ group: 'arrows', field: 'radius', label: 'Arrow Radius', min: 0, max: 50 }),
          ])}
          {renderSection('Colors', [
            colorField({ field: 'stageStroke', label: 'Stage Outline' }),
            colorField({ field: 'bodyStroke', label: 'Body Outline' }),
            colorField({ field: 'arrowHover', label: 'Arrow Hover' }),
            colorField({ field: 'tabHover', label: 'Tab Hover' }),
            colorField({ field: 'learnMoreStroke', label: 'Learn More Outline' }),
          ])}
        </div>
      ) : null}

      {tab === 'header' ? (
        <div style={sectionGridStyle}>
          {renderSection('Header Geometry', [
            numberField({ group: 'header', field: 'insetX', label: 'Header Inset X', min: 0, max: 120 }),
            numberField({ group: 'header', field: 'tabTop', label: 'Tab Top', min: 0, max: 60 }),
            numberField({ group: 'header', field: 'minTabsH', label: 'Min Tab Height', min: 30, max: 120 }),
            numberField({ group: 'header', field: 'activeLineH', label: 'Active Line H', min: 1, max: 12, step: 0.5 }),
          ])}
          {renderSection('Tab Text', [
            numberField({ group: 'header', field: 'tabMaxFont', label: 'Tab Max Font', min: 10, max: 42 }),
            numberField({ group: 'header', field: 'tabMinFont', label: 'Tab Min Font', min: 8, max: 30 }),
            numberField({ group: 'header', field: 'tabFirstBoost', label: 'First Letter Boost', min: 0, max: 20 }),
            numberField({ group: 'header', field: 'tabCountW', label: 'Count Box Width', min: 28, max: 120 }),
          ])}
        </div>
      ) : null}

      {tab === 'body' ? (
        <div style={sectionGridStyle}>
          {renderSection('Body Frame', [
            numberField({ group: 'body', field: 'insetX', label: 'Body Padding X', min: 0, max: 120 }),
            numberField({ group: 'body', field: 'topGap', label: 'Top Gap', min: 0, max: 80 }),
            numberField({ group: 'body', field: 'bottomGap', label: 'Bottom Gap', min: 0, max: 80 }),
            numberField({ group: 'body', field: 'radius', label: 'Body Radius', min: 0, max: 40 }),
            numberField({ group: 'body', field: 'outlineWidth', label: 'Outline Width', min: 0.5, max: 6, step: 0.1 }),
          ])}
          {renderSection('Responsive Split', [
            numberField({ group: 'body', field: 'splitRatio', label: 'A/B Split Ratio', min: 0.1, max: 0.9, step: 0.01 }),
            numberField({ group: 'body', field: 'narrowAHeightRatio', label: 'Narrow A Height', min: 0.2, max: 0.9, step: 0.01 }),
            numberField({ group: 'body', field: 'minAWidth', label: 'A Min Width', min: 220, max: 900 }),
            numberField({ group: 'body', field: 'minBWidth', label: 'B Min Width', min: 160, max: 700 }),
          ])}
        </div>
      ) : null}

      {tab === 'sideA' ? (
        <div style={sectionGridStyle}>
          {isFeaturedScope ? renderSection('Media Placement', [
            selectField({ group: 'sideA', field: 'mediaFit', label: 'Fit Mode', options: mediaFitOptions }),
            numberField({ group: 'sideA', field: 'mediaAnchorX', label: 'Anchor X', min: 0, max: 100 }),
            numberField({ group: 'sideA', field: 'mediaAnchorY', label: 'Anchor Y', min: 0, max: 100 }),
            numberField({ group: 'sideA', field: 'mediaOffsetX', label: 'Nudge X', min: -800, max: 800 }),
            numberField({ group: 'sideA', field: 'mediaOffsetY', label: 'Nudge Y', min: -600, max: 600 }),
            numberField({ group: 'sideA', field: 'mediaScale', label: 'Media Scale', min: 0.5, max: 2.5, step: 0.01 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Top Badges', [
            numberField({ group: 'sideA', field: 'topBadgeInset', label: 'Right Inset', min: 0, max: 120 }),
            numberField({ group: 'sideA', field: 'topBadgeY', label: 'Top Y', min: 0, max: 120 }),
            numberField({ group: 'sideA', field: 'topBadgeH', label: 'Height', min: 12, max: 60 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Bottom Badges', [
            numberField({ group: 'sideA', field: 'bottomBadgeInset', label: 'Left Inset', min: 0, max: 120 }),
            numberField({ group: 'sideA', field: 'bottomBadgeBottom', label: 'Bottom Offset', min: 0, max: 120 }),
            numberField({ group: 'sideA', field: 'bottomBadgeH', label: 'Height', min: 12, max: 70 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Learn More', [
            numberField({ group: 'sideA', field: 'learnMoreW', label: 'Width', min: 80, max: 260 }),
            numberField({ group: 'sideA', field: 'learnMoreH', label: 'Height', min: 24, max: 90 }),
            numberField({ group: 'sideA', field: 'learnMoreRight', label: 'Right Inset', min: 0, max: 160 }),
            numberField({ group: 'sideA', field: 'learnMoreBottom', label: 'Bottom Inset', min: 0, max: 160 }),
          ]) : null}
          {isComingSoonScope ? renderSection('Coming Soon Cards', [
            numberField({ group: 'sideA', field: 'cardGap', label: 'Card Gap', min: 0, max: 48 }),
            numberField({ group: 'sideA', field: 'cardMinW', label: 'Card Min Width', min: 80, max: 420 }),
            numberField({ group: 'sideA', field: 'cardPad', label: 'Grid Pad', min: 0, max: 60 }),
            numberField({ group: 'sideA', field: 'cardRadius', label: 'Card Radius', min: 0, max: 36 }),
            numberField({ group: 'sideA', field: 'cardImageRatio', label: 'Image/Text Split', min: 0.25, max: 0.82, step: 0.01 }),
            numberField({ group: 'sideA', field: 'cardCopyPad', label: 'Text Pad', min: 0, max: 40 }),
            numberField({ group: 'sideA', field: 'cardTitleMaxFont', label: 'Title Max Font', min: 8, max: 40 }),
            numberField({ group: 'sideA', field: 'narrowCardTitleMaxFont', label: 'Narrow Title Max', min: 8, max: 56 }),
            numberField({ group: 'sideA', field: 'cardDescMaxFont', label: 'Description Max Font', min: 6, max: 28 }),
            numberField({ group: 'sideA', field: 'narrowCardDescMaxFont', label: 'Narrow Description Max', min: 6, max: 36 }),
            numberField({ group: 'sideA', field: 'cardButtonW', label: 'Button Width', min: 70, max: 240 }),
            numberField({ group: 'sideA', field: 'narrowCardButtonW', label: 'Narrow Button Width', min: 70, max: 280 }),
            numberField({ group: 'sideA', field: 'cardButtonH', label: 'Button Height', min: 22, max: 80 }),
            numberField({ group: 'sideA', field: 'narrowCardButtonH', label: 'Narrow Button Height', min: 22, max: 96 }),
            numberField({ group: 'sideA', field: 'cardButtonFont', label: 'Button Font', min: 6, max: 28, step: 0.5 }),
            numberField({ group: 'sideA', field: 'narrowCardButtonFont', label: 'Narrow Button Font', min: 6, max: 34, step: 0.5 }),
            numberField({ group: 'sideA', field: 'cardButtonArrowW', label: 'Arrow Box Width', min: 12, max: 90 }),
            numberField({ group: 'sideA', field: 'narrowCardButtonArrowW', label: 'Narrow Arrow Box Width', min: 12, max: 110 }),
            selectField({ group: 'sideA', field: 'cardButtonAlign', label: 'Button Align', options: buttonAlignOptions }),
            numberField({ group: 'sideA', field: 'cardButtonBottom', label: 'Button Bottom Gap', min: 0, max: 40 }),
          ]) : null}
        </div>
      ) : null}

      {tab === 'sideB' ? (
        <div style={sectionGridStyle}>
          {isFeaturedScope ? renderSection('Panel', [
            numberField({ group: 'sideB', field: 'outerPad', label: 'Outer Pad', min: 0, max: 40 }),
            numberField({ group: 'sideB', field: 'innerPad', label: 'Inner Pad', min: 0, max: 40 }),
            numberField({ group: 'sideB', field: 'gap', label: 'Child Gap', min: 0, max: 40 }),
            numberField({ group: 'sideB', field: 'textPadX', label: 'Text Side Pad', min: 0, max: 50 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Logo', [
            numberField({ group: 'sideB', field: 'logoH', label: 'Logo Height', min: 20, max: 160 }),
            numberField({ group: 'sideB', field: 'narrowLogoH', label: 'Narrow Logo Height', min: 20, max: 260 }),
            numberField({ group: 'sideB', field: 'logoTaglineGap', label: 'Logo to Tagline Gap', min: -120, max: 120 }),
            numberField({ group: 'sideB', field: 'narrowLogoTaglineGap', label: 'Narrow Logo to Tagline Gap', min: -160, max: 160 }),
            numberField({ group: 'sideB', field: 'logoMaxFont', label: 'Fallback Font', min: 12, max: 90 }),
            numberField({ group: 'sideB', field: 'narrowLogoMaxFont', label: 'Narrow Fallback Font', min: 12, max: 120 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Text', [
            numberField({ group: 'sideB', field: 'taglineH', label: 'Tagline Height', min: 10, max: 100 }),
            numberField({ group: 'sideB', field: 'narrowTaglineH', label: 'Narrow Tagline Height', min: 10, max: 140 }),
            numberField({ group: 'sideB', field: 'taglineMaxFont', label: 'Tagline Font', min: 6, max: 28 }),
            numberField({ group: 'sideB', field: 'narrowTaglineMaxFont', label: 'Narrow Tagline Font', min: 6, max: 38 }),
            numberField({ group: 'sideB', field: 'descMaxFont', label: 'Description Max', min: 8, max: 32 }),
            numberField({ group: 'sideB', field: 'narrowDescMaxFont', label: 'Narrow Description Max', min: 8, max: 44 }),
            numberField({ group: 'sideB', field: 'descMinFont', label: 'Description Min', min: 6, max: 24 }),
            numberField({ group: 'sideB', field: 'narrowDescMinFont', label: 'Narrow Description Min', min: 6, max: 30 }),
          ]) : null}
          {isFeaturedScope ? renderSection('Status', [
            numberField({ group: 'sideB', field: 'statusH', label: 'Status Height', min: 30, max: 180 }),
            numberField({ group: 'sideB', field: 'narrowStatusH', label: 'Narrow Status Height', min: 30, max: 260 }),
            numberField({ group: 'sideB', field: 'statusLabelFont', label: 'Label Font', min: 6, max: 28 }),
            numberField({ group: 'sideB', field: 'narrowStatusLabelFont', label: 'Narrow Label Font', min: 6, max: 36 }),
            numberField({ group: 'sideB', field: 'statusValueFont', label: 'Value Font', min: 6, max: 32 }),
            numberField({ group: 'sideB', field: 'narrowStatusValueFont', label: 'Narrow Value Font', min: 6, max: 40 }),
          ]) : null}
          {isComingSoonScope ? renderSection('Catalog Montage', [
            numberField({ group: 'sideB', field: 'montageRows', label: 'Rows', min: 1, max: 5, step: 1 }),
            numberField({ group: 'sideB', field: 'montageColumns', label: 'Columns', min: 1, max: 6, step: 1 }),
            numberField({ group: 'sideB', field: 'montageGap', label: 'Image Gap', min: 0, max: 24 }),
            numberField({ group: 'sideB', field: 'montageH', label: 'Montage Height', min: 40, max: 520 }),
            numberField({ group: 'sideB', field: 'montageImageRadius', label: 'Image Radius', min: 0, max: 36 }),
            selectField({ group: 'sideB', field: 'montageImageFit', label: 'Image Fit', options: montageFitOptions }),
            numberField({ group: 'sideB', field: 'montageImageBlur', label: 'Image Blur', min: 0, max: 2, step: 0.1 }),
            numberField({ group: 'sideB', field: 'montageImageOutlineWidth', label: 'Image Outline W', min: 0, max: 6, step: 0.1 }),
            numberField({ group: 'sideB', field: 'montageImageOutlineOpacity', label: 'Image Outline Alpha', min: 0, max: 1, step: 0.01 }),
            numberField({ group: 'sideB', field: 'montageSlideDuration', label: 'Slide Duration', min: 6, max: 90 }),
            numberField({ group: 'sideB', field: 'narrowMontageH', label: 'Narrow Montage Height', min: 40, max: 760 }),
          ]) : null}
          {isComingSoonScope ? renderSection('Catalog Text / Button', [
            numberField({ group: 'sideB', field: 'catalogPanelPadX', label: 'Panel Pad X', min: 0, max: 80 }),
            numberField({ group: 'sideB', field: 'catalogPanelPadY', label: 'Panel Pad Y', min: 0, max: 80 }),
            numberField({ group: 'sideB', field: 'catalogCopyGap', label: 'Copy Gap', min: 0, max: 60 }),
            numberField({ group: 'sideB', field: 'catalogCopyOffsetY', label: 'Copy Nudge Y', min: -160, max: 160 }),
            numberField({ group: 'sideB', field: 'catalogEyebrowFont', label: 'Eyebrow Font', min: 6, max: 28 }),
            numberField({ group: 'sideB', field: 'narrowCatalogEyebrowFont', label: 'Narrow Eyebrow Font', min: 6, max: 36 }),
            numberField({ group: 'sideB', field: 'catalogEyebrowGap', label: 'Eyebrow Gap', min: -30, max: 60 }),
            numberField({ group: 'sideB', field: 'catalogTitleFont', label: 'Title Font', min: 12, max: 72 }),
            numberField({ group: 'sideB', field: 'narrowCatalogTitleFont', label: 'Narrow Title Font', min: 12, max: 96 }),
            numberField({ group: 'sideB', field: 'catalogTitleGap', label: 'Title Gap', min: -30, max: 80 }),
            numberField({ group: 'sideB', field: 'catalogDescFont', label: 'Description Font', min: 8, max: 32 }),
            numberField({ group: 'sideB', field: 'narrowCatalogDescFont', label: 'Narrow Description Font', min: 8, max: 44 }),
            numberField({ group: 'sideB', field: 'catalogButtonW', label: 'Explore Width', min: 90, max: 280 }),
            numberField({ group: 'sideB', field: 'narrowCatalogButtonW', label: 'Narrow Explore Width', min: 90, max: 340 }),
            numberField({ group: 'sideB', field: 'catalogButtonH', label: 'Explore Height', min: 26, max: 90 }),
            numberField({ group: 'sideB', field: 'narrowCatalogButtonH', label: 'Narrow Explore Height', min: 26, max: 110 }),
            numberField({ group: 'sideB', field: 'catalogButtonFont', label: 'Explore Font', min: 6, max: 30, step: 0.5 }),
            numberField({ group: 'sideB', field: 'narrowCatalogButtonFont', label: 'Narrow Explore Font', min: 6, max: 38, step: 0.5 }),
            numberField({ group: 'sideB', field: 'catalogButtonArrowW', label: 'Explore Arrow Width', min: 12, max: 90 }),
            numberField({ group: 'sideB', field: 'narrowCatalogButtonArrowW', label: 'Narrow Explore Arrow Width', min: 12, max: 110 }),
            selectField({ group: 'sideB', field: 'catalogButtonAlign', label: 'Explore Align', options: buttonAlignOptions }),
          ]) : null}
        </div>
      ) : null}

      {tab === 'footer' ? (
        <div style={sectionGridStyle}>
          {renderSection('Footer Shell', [
            numberField({ group: 'footer', field: 'height', label: 'Footer Height', min: 12, max: 80 }),
            numberField({ group: 'footer', field: 'trackInset', label: 'Track Inset', min: 0, max: 120 }),
          ])}
          {renderSection('Indicator Count', [
            numberField({ group: 'footer', field: 'maxVisible', label: 'Max Visible', min: 3, max: 80 }),
            numberField({ group: 'footer', field: 'minGap', label: 'Minimum Gap', min: 0, max: 24 }),
          ])}
          {renderSection('Indicator Shape', [
            numberField({ group: 'footer', field: 'inactiveW', label: 'Inactive Width', min: 4, max: 50 }),
            numberField({ group: 'footer', field: 'activeMultiplier', label: 'Active Multiplier', min: 1, max: 5, step: 0.1 }),
            numberField({ group: 'footer', field: 'pillH', label: 'Pill Height', min: 3, max: 28 }),
          ])}
          {renderSection('Divider Line', [
            toggleField('footer', 'showLine', 'Draw Line'),
            numberField({ group: 'footer', field: 'lineInset', label: 'Line Inset X', min: 0, max: 480 }),
            numberField({ group: 'footer', field: 'lineWidth', label: 'Line Width', min: 0.5, max: 8, step: 0.1 }),
            numberField({ group: 'footer', field: 'lineOpacity', label: 'Line Opacity', min: 0, max: 1, step: 0.01 }),
          ])}
        </div>
      ) : null}
    </div>
  );
});
