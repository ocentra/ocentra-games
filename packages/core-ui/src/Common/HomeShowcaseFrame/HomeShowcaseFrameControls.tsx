import React, { memo, useEffect, useState } from 'react';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  resolveHomeShowcaseFrameControlsForVariant,
  serializeHomeShowcaseFrameControls,
  type HomeShowcaseControlTab,
  type HomeShowcaseControlVariant,
  type HomeShowcaseFrameControlGroups,
  type HomeShowcaseFrameControls,
  type HomeShowcaseFrameNumberControlGroup,
  type HomeShowcasePreviewLayoutMode,
} from './HomeShowcaseFrame.types';

type HomeShowcaseFrameControlsProps = {
  title?: string;
  description?: string;
  controls: HomeShowcaseFrameControls;
  onControlsChange: React.Dispatch<React.SetStateAction<HomeShowcaseFrameControls>>;
  onSave?: (controls: HomeShowcaseFrameControls) => Promise<string | void> | string | void;
  previewLayoutMode?: HomeShowcasePreviewLayoutMode;
  onPreviewLayoutModeChange?: (mode: HomeShowcasePreviewLayoutMode) => void;
  responsiveVariant?: HomeShowcaseControlVariant;
  resolveImageUrl?: (hash: string) => string | null | undefined;
  onImageUpload?: (file: File) => Promise<string | null | undefined>;
  showActions?: boolean;
};

type HomeShowcaseCopySubtab = 'textStyle' | 'bannerCopy';

type NumberFieldConfig = {
  group: HomeShowcaseFrameNumberControlGroup;
  field: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
};

type ColorFieldConfig = {
  field: keyof HomeShowcaseFrameControls['colors'];
  label: string;
};

type CopyColorFieldConfig = {
  field: keyof Pick<HomeShowcaseFrameControls['copy'], 'titleColor' | 'bodyColor' | 'titleGlowColor'>;
  label: string;
};

type CopyTextFieldConfig = {
  field: keyof Pick<HomeShowcaseFrameControls['copy'], 'bodyAccentPalette'>;
  label: string;
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

const secondaryTabRowStyle: React.CSSProperties = {
  ...tabRowStyle,
  gap: '0.4rem',
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
  ...fieldControlsStyle,
  gridTemplateColumns: '2.5rem minmax(5.5rem, 1fr) 2rem',
};

const alphaControlsStyle: React.CSSProperties = {
  ...fieldControlsStyle,
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.25rem, 5rem) 2rem',
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

const compactFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  gap: '0.32rem',
  padding: '0.42rem',
};

const itemCardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(7.5rem, 9rem) minmax(11rem, 0.42fr) minmax(18rem, 1fr) max-content',
  alignItems: 'start',
  gap: '0.55rem',
  border: '1px solid rgba(103, 232, 249, 0.18)',
  borderRadius: '0.65rem',
  background: 'rgba(8, 13, 31, 0.72)',
  padding: '0.55rem',
  minWidth: 0,
};

const itemPreviewStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto minmax(4.25rem, 5rem)',
  gap: '0.35rem',
  minWidth: 0,
};

const itemImageStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 10',
  objectFit: 'cover',
  borderRadius: '0.5rem',
  border: '1px solid rgba(103, 232, 249, 0.28)',
  background: 'rgba(15, 23, 42, 0.86)',
};

const itemImageFallbackStyle: React.CSSProperties = {
  ...itemImageStyle,
  display: 'grid',
  placeItems: 'center',
  color: 'rgba(207, 250, 254, 0.56)',
  fontSize: '0.72rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const hiddenFileInputStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
};

const itemHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const itemActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
};

const itemActionColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(4.35rem, 1fr))',
  alignContent: 'start',
  justifyItems: 'stretch',
  gap: '0.35rem',
  minWidth: '9.1rem',
};

const compactButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.32)',
  borderRadius: '0.45rem',
  background: 'rgba(8, 47, 73, 0.58)',
  color: '#cffafe',
  padding: '0.32rem 0.5rem',
  fontSize: '0.7rem',
  fontWeight: 800,
  cursor: 'pointer',
};

const itemImageButtonStyle: React.CSSProperties = {
  ...compactButtonStyle,
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  minHeight: '4.25rem',
  padding: '0.35rem',
  overflow: 'hidden',
};

const itemImageActionTextStyle: React.CSSProperties = {
  position: 'absolute',
  insetInline: '0.35rem',
  bottom: '0.35rem',
  borderRadius: '0.35rem',
  background: 'rgba(2, 6, 23, 0.72)',
  color: '#cffafe',
  fontSize: '0.66rem',
  fontWeight: 900,
  padding: '0.18rem 0.28rem',
  textAlign: 'center',
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

type HomePrimitive = number | boolean | string;
type HomeControlGroupName = keyof HomeShowcaseFrameControlGroups;

const homeNarrowFieldAliases: Record<string, string> = {
  'overall.marginTop': 'narrowMarginTop',
  'overall.marginBottom': 'narrowMarginBottom',
  'overall.wideHeight': 'narrowHeight',
  'overall.stageWideH': 'stageNarrowH',
};

function getVariantField(
  group: HomeControlGroupName,
  field: string,
  variant: HomeShowcaseControlVariant,
): string {
  return variant === 'narrow'
    ? homeNarrowFieldAliases[`${String(group)}.${field}`] ?? field
    : field;
}

function getVariantPrimitiveValue(
  controls: HomeShowcaseFrameControls,
  group: HomeControlGroupName,
  field: string,
  variant: HomeShowcaseControlVariant,
): HomePrimitive | undefined {
  const actualField = getVariantField(group, field, variant);
  const variantRecord = controls.variants?.[variant]?.[group] as Record<string, HomePrimitive> | undefined;
  const groupRecord = controls[group] as Record<string, HomePrimitive>;
  return variantRecord?.[actualField] ?? groupRecord[actualField];
}

function setVariantPrimitiveValue(
  controls: HomeShowcaseFrameControls,
  group: HomeControlGroupName,
  field: string,
  variant: HomeShowcaseControlVariant,
  value: HomePrimitive,
): HomeShowcaseFrameControls {
  const actualField = getVariantField(group, field, variant);
  const groupRecord = controls[group] as Record<string, HomePrimitive>;
  const variantControls = controls.variants?.[variant]
    ?? resolveHomeShowcaseFrameControlsForVariant(controls, variant);
  const variantGroup = variantControls[group] as Record<string, HomePrimitive> | undefined;
  const radiusPatch = group === 'body' && field === 'radius'
    ? {
        radiusTopLeft: value,
        radiusTopRight: value,
        radiusBottomRight: value,
        radiusBottomLeft: value,
      }
    : {};

  return {
    ...controls,
    [group]: {
      ...controls[group],
      [actualField]: value,
      ...radiusPatch,
    },
    variants: {
      ...controls.variants,
      [variant]: {
        ...variantControls,
        [group]: {
          ...groupRecord,
          ...variantGroup,
          [actualField]: value,
          ...radiusPatch,
        },
      },
    },
  };
}

function getNumberValue(
  controls: HomeShowcaseFrameControls,
  group: HomeShowcaseFrameNumberControlGroup,
  field: string,
): number {
  const value = (controls[group] as Record<string, number | boolean | string>)[field];
  return typeof value === 'number' ? value : 0;
}

function getBooleanValue(
  controls: HomeShowcaseFrameControls,
  group: HomeShowcaseFrameNumberControlGroup,
  field: string,
): boolean {
  const value = (controls[group] as Record<string, number | boolean | string>)[field];
  return typeof value === 'boolean' ? value : false;
}

function getStringValue(
  controls: HomeShowcaseFrameControls,
  group: HomeShowcaseFrameNumberControlGroup,
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

function normalizeBannerItem(item: FeatureBannerItem): FeatureBannerItem {
  return {
    title: item.title,
    description: item.description,
    imageHash: item.imageHash,
  };
}

function createBannerItem(source?: FeatureBannerItem): FeatureBannerItem {
  return {
    title: 'New Banner',
    description: 'Banner sub text',
    imageHash: source?.imageHash ?? '',
  };
}

export const HomeShowcaseFrameControlsPanel = memo(function HomeShowcaseFrameControlsPanel({
  title = 'Homepage Showcase Frame Controls',
  description = 'Shared SVG frame tuning for a homepage block.',
  controls,
  onControlsChange,
  onSave,
  previewLayoutMode = 'auto',
  onPreviewLayoutModeChange,
  responsiveVariant = 'wide',
  resolveImageUrl,
  onImageUpload,
  showActions = true,
}: HomeShowcaseFrameControlsProps) {
  const [tab, setTab] = useState<HomeShowcaseControlTab>('overall');
  const [copySubtab, setCopySubtab] = useState<HomeShowcaseCopySubtab>('textStyle');
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  useEffect(() => {
    setCopiedValue(null);
  }, [controls]);

  const setNumber = (
    group: HomeShowcaseFrameNumberControlGroup,
    field: string,
    value: number,
  ) => {
    onControlsChange((prev) => setVariantPrimitiveValue(
      prev,
      group,
      field,
      responsiveVariant,
      value,
    ));
  };

  const resetNumber = (
    group: HomeShowcaseFrameNumberControlGroup,
    field: string,
  ) => {
    const actualField = getVariantField(group, field, responsiveVariant);
    const defaults = DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS[group] as Record<string, number | boolean | string>;
    setNumber(group, field, Number(defaults[actualField]));
  };

  const setBoolean = (
    group: HomeShowcaseFrameNumberControlGroup,
    field: string,
    value: boolean,
  ) => {
    onControlsChange((prev) => setVariantPrimitiveValue(
      prev,
      group,
      field,
      responsiveVariant,
      value,
    ));
  };

  const resetBoolean = (
    group: HomeShowcaseFrameNumberControlGroup,
    field: string,
  ) => {
    const actualField = getVariantField(group, field, responsiveVariant);
    const defaults = DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS[group] as Record<string, number | boolean | string>;
    setBoolean(group, field, Boolean(defaults[actualField]));
  };

  const setColor = (field: keyof HomeShowcaseFrameControls['colors'], value: string) => {
    onControlsChange((prev) => setVariantPrimitiveValue(
      prev,
      'colors',
      field,
      responsiveVariant,
      value,
    ));
  };

  const setCopyString = (field: keyof HomeShowcaseFrameControls['copy'], value: string) => {
    onControlsChange((prev) => setVariantPrimitiveValue(
      prev,
      'copy',
      field,
      responsiveVariant,
      value,
    ));
  };

  const resetCopyString = (field: keyof HomeShowcaseFrameControls['copy']) => {
    setCopyString(field, String(DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy[field] ?? ''));
  };

  const resetColor = (field: keyof HomeShowcaseFrameControls['colors']) => {
    setColor(field, DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors[field]);
  };

  const updateBannerItem = (
    index: number,
    patch: Partial<FeatureBannerItem>,
  ) => {
    onControlsChange((prev) => {
      const items = [...(prev.items ?? [])];
      const existing = items[index] ?? createBannerItem(items[index - 1]);
      items[index] = normalizeBannerItem({ ...existing, ...patch });
      return { ...prev, items };
    });
  };

  const addBannerItem = () => {
    onControlsChange((prev) => {
      const items = [...(prev.items ?? [])];
      items.push(createBannerItem(items.at(-1)));
      return { ...prev, items };
    });
  };

  const duplicateBannerItem = (index: number) => {
    onControlsChange((prev) => {
      const items = [...(prev.items ?? [])];
      const source = items[index] ?? createBannerItem(items.at(-1));
      items.splice(index + 1, 0, {
        ...normalizeBannerItem(source),
        title: `${source.title || 'Banner'} Copy`,
      });
      return { ...prev, items };
    });
  };

  const removeBannerItem = (index: number) => {
    onControlsChange((prev) => {
      const items = [...(prev.items ?? [])];
      items.splice(index, 1);
      return { ...prev, items: items.length > 0 ? items : undefined };
    });
  };

  const moveBannerItem = (index: number, direction: -1 | 1) => {
    onControlsChange((prev) => {
      const items = [...(prev.items ?? [])];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return prev;
      }
      const current = items[index];
      items[index] = items[nextIndex];
      items[nextIndex] = current;
      return { ...prev, items };
    });
  };

  const clearBannerItems = () => {
    onControlsChange((prev) => ({ ...prev, items: undefined }));
  };

  const uploadBannerImage = async (index: number, file: File | null | undefined) => {
    if (!file || !onImageUpload) {
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      setSaveStatus('Select an image file.');
      return;
    }
    setUploadingImageIndex(index);
    setSaveStatus(null);
    try {
      const imageHash = await onImageUpload(file);
      if (imageHash) {
        updateBannerItem(index, { imageHash });
        setSaveStatus('Image updated.');
      }
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const handleBannerImageDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      void uploadBannerImage(index, file);
      return;
    }
    const droppedImageHash =
      event.dataTransfer.getData('text/asset-hash') ||
      event.dataTransfer.getData('text/asset-guid') ||
      event.dataTransfer.getData('text/plain');
    if (droppedImageHash) {
      updateBannerItem(index, { imageHash: droppedImageHash });
      setSaveStatus('Image updated.');
    }
  };

  const getSerializedControls = (): HomeShowcaseFrameControls =>
    serializeHomeShowcaseFrameControls(controls);

  const getCopyValue = () => JSON.stringify(getSerializedControls(), null, 2);

  const resetGroup = (group: keyof HomeShowcaseFrameControls) => {
    onControlsChange((prev) => ({
      ...prev,
      [group]: DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS[group],
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
    const rawValue = getVariantPrimitiveValue(controls, group, field, responsiveVariant);
    const value = typeof rawValue === 'number' ? rawValue : getNumberValue(controls, group, field);
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
    const rawValue = getVariantPrimitiveValue(controls, 'colors', field, responsiveVariant);
    const colorValue = typeof rawValue === 'string' ? rawValue : controls.colors[field];
    const parsed = parseColor(colorValue);
    return (
      <label key={field} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={colorControlsStyle}>
          <input
            type="color"
            value={parsed.hex}
            onChange={(event) => setColor(field, colorWithHex(colorValue, event.target.value))}
            style={{ width: '2.5rem', height: '1.8rem', padding: 0, borderRadius: '0.35rem' }}
          />
          <input
            style={inputStyle}
            value={colorValue}
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
            onChange={(event) => setColor(field, colorWithAlpha(colorValue, Number(event.target.value)))}
          />
          <input
            style={{ ...inputStyle, textAlign: 'right' }}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={Number(parsed.alpha.toFixed(2))}
            onChange={(event) => setColor(field, colorWithAlpha(colorValue, Number(event.target.value)))}
          />
          <span style={{ color: '#a5f3fc', fontSize: '0.68rem' }}>A</span>
        </span>
      </label>
    );
  };

  const copyColorField = ({ field, label }: CopyColorFieldConfig) => {
    const rawValue = getVariantPrimitiveValue(controls, 'copy', field, responsiveVariant);
    const value = typeof rawValue === 'string' ? rawValue : String(controls.copy[field]);
    const parsed = parseColor(value);
    return (
      <label key={field} style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={colorControlsStyle}>
          <input
            type="color"
            value={parsed.hex}
            onChange={(event) => setCopyString(field, colorWithHex(value, event.target.value))}
            style={{ width: '2.5rem', height: '1.8rem', padding: 0, borderRadius: '0.35rem' }}
          />
          <input
            style={inputStyle}
            value={value}
            onChange={(event) => setCopyString(field, event.target.value)}
          />
          <button type="button" title="Reset this color" aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetCopyString(field)}>
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
            onChange={(event) => setCopyString(field, colorWithAlpha(value, Number(event.target.value)))}
          />
          <input
            style={{ ...inputStyle, textAlign: 'right' }}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={Number(parsed.alpha.toFixed(2))}
            onChange={(event) => setCopyString(field, colorWithAlpha(value, Number(event.target.value)))}
          />
          <span style={{ color: '#a5f3fc', fontSize: '0.68rem' }}>A</span>
        </span>
      </label>
    );
  };

  const toggleField = (
    group: HomeShowcaseFrameNumberControlGroup,
    field: string,
    label: string,
  ) => {
    const rawValue = getVariantPrimitiveValue(controls, group, field, responsiveVariant);
    const value = typeof rawValue === 'boolean' ? rawValue : getBooleanValue(controls, group, field);
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

  const textAlignField = () => {
    const rawValue = getVariantPrimitiveValue(controls, 'copy', 'textAlign', responsiveVariant);
    const value = typeof rawValue === 'string' ? rawValue : getStringValue(controls, 'copy', 'textAlign');
    return (
      <label key="copy.textAlign" style={fieldStyle}>
        <span style={fieldLabelStyle}>Text Align</span>
        <span style={fieldControlsStyle}>
          <select
            style={{ ...inputStyle, gridColumn: '1 / span 2' }}
            value={value}
            onChange={(event) => setCopyString('textAlign', event.target.value)}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
          <button type="button" title="Reset text align" aria-label="Reset Text Align" style={resetButtonStyle} onClick={() => resetCopyString('textAlign')}>
            R
          </button>
        </span>
      </label>
    );
  };

  const bodyColorModeField = () => {
    const rawValue = getVariantPrimitiveValue(controls, 'copy', 'bodyColorMode', responsiveVariant);
    const value = typeof rawValue === 'string' ? rawValue : getStringValue(controls, 'copy', 'bodyColorMode');
    return (
      <label key="copy.bodyColorMode" style={fieldStyle}>
        <span style={fieldLabelStyle}>Body Color Mode</span>
        <span style={fieldControlsStyle}>
          <select
            style={{ ...inputStyle, gridColumn: '1 / span 2' }}
            value={value}
            onChange={(event) => setCopyString('bodyColorMode', event.target.value)}
          >
            <option value="solid">Solid</option>
            <option value="palette">Palette Per Slide</option>
          </select>
          <button type="button" title="Reset body color mode" aria-label="Reset Body Color Mode" style={resetButtonStyle} onClick={() => resetCopyString('bodyColorMode')}>
            R
          </button>
        </span>
      </label>
    );
  };

  const copyTextField = ({ field, label }: CopyTextFieldConfig) => (
    <label key={field} style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldControlsStyle}>
        <input
          style={{ ...inputStyle, gridColumn: '1 / span 2' }}
          value={String(getVariantPrimitiveValue(controls, 'copy', field, responsiveVariant) ?? controls.copy[field])}
          onChange={(event) => setCopyString(field, event.target.value)}
        />
        <button type="button" title={`Reset ${label}`} aria-label={`Reset ${label}`} style={resetButtonStyle} onClick={() => resetCopyString(field)}>
          R
        </button>
      </span>
    </label>
  );

  const aboutSlotsField = () => {
    const items = controls.items ?? [];
    return (
      <section style={{ ...groupStyle, gridColumn: '1 / -1' }}>
        <div style={itemHeaderStyle}>
          <div style={{ color: '#a5f3fc', fontWeight: 900 }}>Rotation Items</div>
          <div style={itemActionsStyle}>
            <button type="button" style={buttonStyle} onClick={addBannerItem}>
              Add Item
            </button>
            <button type="button" style={buttonStyle} onClick={clearBannerItems}>
              Clear Items
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          {items.length === 0 ? (
            <div style={{ ...fieldStyle, color: 'rgba(207, 250, 254, 0.68)' }}>
              No rotation items are overriding the source asset.
            </div>
          ) : null}
          {items.map((item, index) => {
            const imageUrl = item.imageHash ? resolveImageUrl?.(item.imageHash) : null;
            return (
              <article key={`rotation-item-${index}`} style={itemCardStyle}>
                <div style={itemPreviewStyle}>
                  <span style={{ color: '#cffafe', fontSize: '0.72rem', fontWeight: 900 }}>
                    Item {index + 1}
                  </span>
                  <label
                    style={itemImageButtonStyle}
                    onDrop={(event) => handleBannerImageDrop(event, index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                    }}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="" style={itemImageStyle} />
                    ) : (
                      <div style={itemImageFallbackStyle}>Image</div>
                    )}
                    <span style={itemImageActionTextStyle}>
                      {uploadingImageIndex === index ? 'Uploading...' : 'Change Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      style={hiddenFileInputStyle}
                      disabled={!onImageUpload || uploadingImageIndex !== null}
                      aria-label={`Change image for item ${index + 1}`}
                      onChange={(event) => {
                        void uploadBannerImage(index, event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                <label style={compactFieldStyle}>
                  <span style={fieldLabelStyle}>Banner Title</span>
                  <input
                    style={inputStyle}
                    value={item.title}
                    onChange={(event) => updateBannerItem(index, { title: event.target.value })}
                  />
                </label>
                <label style={compactFieldStyle}>
                  <span style={fieldLabelStyle}>Banner Sub Text</span>
                  <input
                    style={inputStyle}
                    value={item.description}
                    onChange={(event) => updateBannerItem(index, { description: event.target.value })}
                  />
                </label>
                <div style={itemActionColumnStyle}>
                  <button type="button" style={compactButtonStyle} disabled={index === 0} onClick={() => moveBannerItem(index, -1)}>
                    Up
                  </button>
                  <button type="button" style={compactButtonStyle} disabled={index === items.length - 1} onClick={() => moveBannerItem(index, 1)}>
                    Down
                  </button>
                  <button type="button" style={compactButtonStyle} onClick={() => duplicateBannerItem(index)}>
                    Duplicate
                  </button>
                  <button type="button" style={{ ...compactButtonStyle, borderColor: 'rgba(251, 113, 133, 0.5)', color: '#fecdd3' }} onClick={() => removeBannerItem(index)}>
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const renderSection = (sectionTitle: string, fields: React.ReactNode[]) => (
    <section style={groupStyle}>
      <div style={{ color: '#a5f3fc', fontWeight: 800, marginBottom: '0.5rem' }}>{sectionTitle}</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>{fields}</div>
    </section>
  );

  const previewLayoutField = () => {
    if (!onPreviewLayoutModeChange) return null;
    const modes: { id: HomeShowcasePreviewLayoutMode; label: string }[] = [
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

  const tabs: { id: HomeShowcaseControlTab; label: string }[] = [
    { id: 'overall', label: 'Overall' },
    { id: 'body', label: 'Body A|B' },
    { id: 'sideA', label: 'Side A' },
    { id: 'sideB', label: 'Side B' },
    { id: 'copy', label: 'Copy/Text' },
    { id: 'footer', label: 'Footer' },
  ];
  const copySubtabs: { id: HomeShowcaseCopySubtab; label: string }[] = [
    { id: 'textStyle', label: 'Text Style' },
    { id: 'bannerCopy', label: 'Banner Copy' },
  ];
  const isCopyCurrent = copiedValue === getCopyValue();

  return (
    <div style={panelStyle} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      <div style={headerStyle}>
        <div>
          <div style={{ color: '#cffafe', fontSize: '0.9rem', fontWeight: 900 }}>{title}</div>
          <div style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem' }}>{description}</div>
          <div style={{ color: 'rgba(207, 250, 254, 0.64)', fontSize: '0.72rem', marginTop: '0.25rem' }}>Bounds Overlay is editor-only. Page Bleed expands past parent padding; Design Width changes SVG coordinate scale.</div>
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
            <button type="button" style={buttonStyle} onClick={() => resetGroup(tab)}>
              Reset Section
            </button>
            <button type="button" style={{ ...buttonStyle, borderColor: 'rgba(251, 113, 133, 0.5)', color: '#fecdd3' }} onClick={() => onControlsChange(DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS)}>
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
            numberField({ group: 'overall', field: 'marginTop', label: 'Top Margin', min: 0, max: 360 }),
            numberField({ group: 'overall', field: 'marginBottom', label: 'Bottom Margin', min: 0, max: 360 }),
            numberField({ group: 'overall', field: 'viewWidth', label: 'Design Width / Scale', min: 760, max: 2600 }),
            numberField({ group: 'overall', field: 'wideHeight', label: 'Outer Height', min: 160, max: 2600 }),
            numberField({ group: 'overall', field: 'narrowBreakpoint', label: 'Narrow Breakpoint', min: 0, max: 1600 }),
          ])}
          {renderSection('Stage Box', [
            numberField({ group: 'overall', field: 'stageInsetX', label: 'Stage Inset X', min: 0, max: 260 }),
            numberField({ group: 'overall', field: 'stageY', label: 'Stage Top Y', min: 0, max: 300 }),
            numberField({ group: 'overall', field: 'stageWideH', label: 'Stage Height', min: 120, max: 2400 }),
            numberField({ group: 'overall', field: 'stageRadius', label: 'Stage Radius', min: 0, max: 80 }),
          ])}
          {renderSection('Colors', [
            colorField({ field: 'stageStroke', label: 'Stage Outline' }),
            colorField({ field: 'bodyStroke', label: 'Body Outline' }),
            colorField({ field: 'stageFill', label: 'Stage Fill' }),
            colorField({ field: 'sideBFill', label: 'Side B Fill' }),
            colorField({ field: 'debugStage', label: 'Debug Stage' }),
            colorField({ field: 'debugBody', label: 'Debug Body' }),
          ])}
        </div>
      ) : null}

      {tab === 'body' ? (
        <div style={sectionGridStyle}>
          {renderSection('Body Frame', [
            numberField({ group: 'body', field: 'insetX', label: 'Body Padding X', min: 0, max: 180 }),
            numberField({ group: 'body', field: 'topGap', label: 'Top Gap', min: 0, max: 180 }),
            numberField({ group: 'body', field: 'bottomGap', label: 'Bottom Gap', min: 0, max: 180 }),
            numberField({ group: 'body', field: 'radius', label: 'Body Radius', min: 0, max: 60 }),
            numberField({ group: 'body', field: 'outlineWidth', label: 'Outline Width', min: 0.5, max: 8, step: 0.1 }),
          ])}
          {renderSection('Corner Radius', [
            numberField({ group: 'body', field: 'radiusTopLeft', label: 'Top Left', min: 0, max: 120 }),
            numberField({ group: 'body', field: 'radiusTopRight', label: 'Top Right', min: 0, max: 120 }),
            numberField({ group: 'body', field: 'radiusBottomRight', label: 'Bottom Right', min: 0, max: 120 }),
            numberField({ group: 'body', field: 'radiusBottomLeft', label: 'Bottom Left', min: 0, max: 120 }),
          ])}
          {renderSection('Responsive Split', [
            numberField({ group: 'body', field: 'splitRatio', label: 'A/B Split Ratio', min: 0.1, max: 0.9, step: 0.01 }),
            numberField({ group: 'body', field: 'narrowAHeightRatio', label: 'Narrow A Height', min: 0.2, max: 0.9, step: 0.01 }),
            numberField({ group: 'body', field: 'minAWidth', label: 'A Min Width', min: 120, max: 1200 }),
            numberField({ group: 'body', field: 'minBWidth', label: 'B Min Width', min: 120, max: 1200 }),
          ])}
        </div>
      ) : null}

      {tab === 'sideA' ? (
        <div style={sectionGridStyle}>
          {renderSection('Slot Padding', [
            numberField({ group: 'sideA', field: 'padX', label: 'Pad X', min: 0, max: 160 }),
            numberField({ group: 'sideA', field: 'padY', label: 'Pad Y', min: 0, max: 160 }),
          ])}
          {renderSection('Slot Layer / Pop Out', [
            numberField({ group: 'sideA', field: 'contentScale', label: 'Content Scale', min: 0.25, max: 3, step: 0.01 }),
            numberField({ group: 'sideA', field: 'contentOffsetX', label: 'Offset X', min: -800, max: 800 }),
            numberField({ group: 'sideA', field: 'contentOffsetY', label: 'Offset Y', min: -600, max: 600 }),
            numberField({ group: 'sideA', field: 'contentZIndex', label: 'Layer Z', min: 0, max: 20 }),
            toggleField('sideA', 'overflowVisible', 'Allow Overflow'),
          ])}
          {renderSection('Cube Glow', [
            numberField({ group: 'sideA', field: 'glowOpacity', label: 'Opacity', min: 0, max: 1, step: 0.01 }),
            numberField({ group: 'sideA', field: 'glowSize', label: 'Size %', min: 20, max: 260 }),
            numberField({ group: 'sideA', field: 'glowBlur', label: 'Blur', min: 0, max: 80 }),
            numberField({ group: 'sideA', field: 'glowOffsetX', label: 'Offset X', min: -320, max: 320 }),
            numberField({ group: 'sideA', field: 'glowOffsetY', label: 'Offset Y', min: -260, max: 260 }),
          ])}
        </div>
      ) : null}

      {tab === 'sideB' ? (
        <div style={sectionGridStyle}>
          {renderSection('Slot Padding', [
            numberField({ group: 'sideB', field: 'padX', label: 'Pad X', min: 0, max: 160 }),
            numberField({ group: 'sideB', field: 'padY', label: 'Pad Y', min: 0, max: 160 }),
          ])}
          {renderSection('Slot Layer / Pop Out', [
            numberField({ group: 'sideB', field: 'contentScale', label: 'Content Scale', min: 0.25, max: 3, step: 0.01 }),
            numberField({ group: 'sideB', field: 'contentOffsetX', label: 'Offset X', min: -800, max: 800 }),
            numberField({ group: 'sideB', field: 'contentOffsetY', label: 'Offset Y', min: -600, max: 600 }),
            numberField({ group: 'sideB', field: 'contentZIndex', label: 'Layer Z', min: 0, max: 20 }),
            toggleField('sideB', 'overflowVisible', 'Allow Overflow'),
          ])}
        </div>
      ) : null}

      {tab === 'copy' ? (
        <div>
          <div style={secondaryTabRowStyle}>
            {copySubtabs.map((item) => (
              <button
                key={item.id}
                type="button"
                style={copySubtab === item.id ? activeButtonStyle : buttonStyle}
                onClick={() => setCopySubtab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {copySubtab === 'textStyle' ? (
            <div style={sectionGridStyle}>
              {renderSection('Main Text', [
                numberField({ group: 'copy', field: 'titleMaxFont', label: 'Title Max Font', min: 10, max: 120 }),
                numberField({ group: 'copy', field: 'titleMinFont', label: 'Title Min Font', min: 8, max: 80 }),
                numberField({ group: 'copy', field: 'titleLetterSpacing', label: 'Title Letter Spacing', min: 0, max: 0.4, step: 0.01 }),
                copyColorField({ field: 'titleColor', label: 'Title Color' }),
                copyColorField({ field: 'titleGlowColor', label: 'Title Glow' }),
              ])}
              {renderSection('Sub Text', [
                numberField({ group: 'copy', field: 'bodyMaxFont', label: 'Body Max Font', min: 8, max: 60 }),
                numberField({ group: 'copy', field: 'bodyMinFont', label: 'Body Min Font', min: 6, max: 40 }),
                numberField({ group: 'copy', field: 'bodyLineHeight', label: 'Body Line Height', min: 0.8, max: 2.2, step: 0.01 }),
                numberField({ group: 'copy', field: 'gap', label: 'Text Gap', min: 0, max: 80 }),
                copyColorField({ field: 'bodyColor', label: 'Body Color' }),
                bodyColorModeField(),
                copyTextField({ field: 'bodyAccentPalette', label: 'Line Palette' }),
                textAlignField(),
              ])}
            </div>
          ) : null}
          {copySubtab === 'bannerCopy' ? (
            <div style={sectionGridStyle}>
              {aboutSlotsField()}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'footer' ? (
        <div style={sectionGridStyle}>
          {renderSection('Footer Slot', [
            numberField({ group: 'footer', field: 'height', label: 'Footer Height', min: 0, max: 160 }),
            numberField({ group: 'footer', field: 'insetX', label: 'Footer Inset X', min: 0, max: 220 }),
          ])}
          {renderSection('Divider Line', [
            toggleField('footer', 'showLine', 'Draw Line'),
            numberField({ group: 'footer', field: 'lineInsetX', label: 'Line Inset X', min: 0, max: 520 }),
            numberField({ group: 'footer', field: 'lineWidth', label: 'Line Width', min: 0.5, max: 8, step: 0.1 }),
            numberField({ group: 'footer', field: 'lineOpacity', label: 'Line Opacity', min: 0, max: 1, step: 0.01 }),
          ])}
        </div>
      ) : null}
    </div>
  );
});
