import React, { useState, useMemo, useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type {
  CardGameLayoutDocument,
} from "@ocentra/game-ui-types/cardGameLayoutTypes";
import type { SeatLayout } from "@ocentra/game-ui-types/tableLayoutTypes";
import type {
  HudArtworkControls,
  HudButtonControls,
} from "./scene/HudArtwork.types";
import {
  DEFAULT_TABLE_SHAPE,
  DEFAULT_PLAYER_UI_DEFAULTS,
  DEFAULT_HUD_BUTTON_CONTROLS,
  DEFAULT_HUD_ARTWORK_CONTROLS,
  DEFAULT_CARD_FAN_CONTROLS,
  DEFAULT_CARD_VISUAL_CONTROLS,
  cloneCardGameLayoutDocument,
  createLayoutPreset,
  seedLayoutPresetFromSource,
} from "@ocentra/game-layout-domain/cardGameLayoutRuntime";
import { tableLayoutStore } from "@ocentra/game-layout-domain/tableLayoutStore";

export type WorkspaceSectionKey = "layerSplit" | "hudTuning" | "hudButtons" | "table" | "cardVisuals" | "cardInHand";
type EditorSectionKey = "layout" | "geometry" | "effects" | "colors";
type TableSectionKey = "shape" | "seats" | "playerUi";
type LayerKey = "background" | "header" | "table" | "seats" | "cards" | "hud" | "tools" | "footer";

export interface CardGameDesignStudioProps {
  document: CardGameLayoutDocument;
  onChange: (next: CardGameLayoutDocument) => void;
  initialWorkspaceSection?: WorkspaceSectionKey;
  activePlayerCount?: number;
  onActivePlayerCountChange?: (count: number) => void;
  minPlayerCount?: number;
  maxPlayerCount?: number;
  embedded?: boolean;
}

const WORKSPACE_TABS: Array<{ key: WorkspaceSectionKey; label: string }> = [
  { key: "layerSplit", label: "Layer Split" },
  { key: "hudTuning", label: "HUD Tuning" },
  { key: "hudButtons", label: "HUD Button Editor" },
  { key: "table", label: "Table" },
  { key: "cardVisuals", label: "Card Visuals" },
  { key: "cardInHand", label: "Card in Hand" },
];

const HUD_BUTTON_SECTIONS: Array<{ key: EditorSectionKey; label: string }> = [
  { key: "layout", label: "Layout" },
  { key: "geometry", label: "Geometry" },
  { key: "effects", label: "Effects" },
  { key: "colors", label: "Colours" },
];

const TABLE_SECTIONS: Array<{ key: TableSectionKey; label: string }> = [
  { key: "shape", label: "Shape" },
  { key: "seats", label: "Seats" },
  { key: "playerUi", label: "Player UI" },
];

const HUD_BUTTON_SLOTS = ["A", "B", "C", "D", "E", "F"];

const LAYER_OPTIONS: Array<{ key: LayerKey; label: string }> = [
  { key: "background", label: "Background" },
  { key: "header", label: "Header" },
  { key: "table", label: "Table" },
  { key: "seats", label: "Seats" },
  { key: "cards", label: "Cards" },
  { key: "hud", label: "HUD" },
  { key: "tools", label: "Tools" },
  { key: "footer", label: "Footer" },
];

const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 10;

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  onReset?: () => void;
}

function NumberField({ label, value, min, max, step, disabled, onChange, onReset }: NumberFieldProps) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}</span>
        <input className="game-screen__hud-button-field-slider" type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} title="Slide to adjust" />
        <input className="game-screen__hud-button-field-number" type="number" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
        {onReset && (
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset} title="Reset to default" style={{ flex: '0 0 auto', width: '1.25rem', height: '1.25rem', fontSize: '0.75rem' }}>
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  onReset?: () => void;
}

function ColorField({ label, value, disabled, onChange, onReset }: ColorFieldProps) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}</span>
        <input className="game-screen__hud-button-field-color" type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        {onReset && (
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset} title="Reset to default" style={{ flex: '0 0 auto', width: '1.25rem', height: '1.25rem', fontSize: '0.75rem' }}>
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function CheckboxField({ label, value, disabled, onChange }: CheckboxFieldProps) {
  return (
    <div className="game-screen__hud-button-field">
      <label className="game-screen__hud-button-field-line" style={{ cursor: 'pointer' }}>
        <span className="game-screen__hud-button-field-label">{label}</span>
        <input 
          type="checkbox" 
          checked={value} 
          disabled={disabled} 
          onChange={(e) => onChange(e.target.checked)} 
        />
      </label>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}

function TextField({ label, value, disabled, onChange }: TextFieldProps) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}</span>
        <input 
          className="game-screen__hud-button-field-number" 
          style={{ flex: 1, textAlign: 'left', padding: '0 8px' }}
          type="text" 
          value={value} 
          disabled={disabled} 
          onChange={(e) => onChange(e.target.value)} 
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="game-screen__hud-button-section">
      <div className="game-screen__hud-button-modal-tabs" style={{ padding: '0 0.5rem 0.5rem 0', borderBottom: '1px solid rgba(141, 255, 176, 0.1)' }}>
        <strong style={{ opacity: 0.8, fontSize: '0.9rem' }}>{title}</strong>
      </div>
      <div className="game-screen__hud-button-grid" style={{ paddingTop: '1rem' }}>
        {children}
      </div>
    </section>
  );
}

interface TabButtonProps {
  active: boolean;
  compact?: boolean;
  children: ReactNode;
  onClick: () => void;
}

function TabButton({ active, compact = false, children, onClick }: TabButtonProps) {
  return (
    <button type="button"
      className={`game-screen__hud-button-modal-tab ${compact ? "game-screen__hud-button-modal-tab--compact" : ""} ${active ? "game-screen__hud-button-modal-tab--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PlayerCountSelector({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (count: number) => void;
}) {
  const counts = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.5rem 0.75rem', borderBottom: '1px solid rgba(141, 255, 176, 0.1)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.75rem', color: 'rgba(220,255,230,0.7)', flexShrink: 0 }}>Player count:</span>
      {counts.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            padding: '2px 7px',
            borderRadius: '5px',
            border: '1px solid',
            borderColor: value === n ? '#4ade80' : 'rgba(141,255,176,0.2)',
            background: value === n ? 'rgba(74,222,128,0.18)' : 'transparent',
            color: value === n ? '#eaffed' : 'rgba(220,255,230,0.5)',
            fontSize: '0.7rem',
            fontWeight: value === n ? 700 : 400,
            cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export const CardGameDesignStudio: React.FC<CardGameDesignStudioProps> = (props) => {
  const {
    document,
    onChange,
    initialWorkspaceSection,
    activePlayerCount,
    onActivePlayerCountChange,
    minPlayerCount = MIN_PLAYER_COUNT,
    maxPlayerCount = MAX_PLAYER_COUNT,
    embedded = false,
  } = props;

  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSectionKey>(initialWorkspaceSection ?? "hudButtons");
  const [activeSection, setActiveSection] = useState<EditorSectionKey>("layout");
  const [activeTableSection, setActiveTableSection] = useState<TableSectionKey>("shape");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [internalPlayerCount, setInternalPlayerCount] = useState<number>(
    activePlayerCount ?? document.defaultPlayerCount,
  );
  const boundedMinPlayerCount = Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, minPlayerCount));
  const boundedMaxPlayerCount = Math.max(boundedMinPlayerCount, Math.min(MAX_PLAYER_COUNT, maxPlayerCount));
  const resolvedPlayerCount = Math.max(
    boundedMinPlayerCount,
    Math.min(boundedMaxPlayerCount, activePlayerCount ?? internalPlayerCount),
  );
  const selectedSeatId = useSyncExternalStore(
    tableLayoutStore.subscribe,
    () => tableLayoutStore.getState().selectedSeatId,
    () => tableLayoutStore.getState().selectedSeatId,
  );

  const activePreset = useMemo(
    () => document.presets[String(resolvedPlayerCount)] ?? createLayoutPreset(resolvedPlayerCount),
    [document, resolvedPlayerCount],
  );

  const updateDoc = useCallback((updater: (draft: CardGameLayoutDocument) => void) => {
    const next = cloneCardGameLayoutDocument(document);
    updater(next);
    onChange(next);
  }, [document, onChange]);

  const handlePlayerCountChange = useCallback((count: number) => {
    const nextCount = Math.max(boundedMinPlayerCount, Math.min(boundedMaxPlayerCount, count));
    const targetKey = String(nextCount);
    if (!document.presets[targetKey]) {
      const sourcePreset =
        document.presets[String(resolvedPlayerCount)] ??
        document.presets[String(Math.max(boundedMinPlayerCount, nextCount - 1))] ??
        null;
      updateDoc((draft) => {
        draft.presets[targetKey] = seedLayoutPresetFromSource(sourcePreset, nextCount);
      });
    }
    setInternalPlayerCount(nextCount);
    onActivePlayerCountChange?.(nextCount);
  }, [boundedMaxPlayerCount, boundedMinPlayerCount, document.presets, onActivePlayerCountChange, resolvedPlayerCount, updateDoc]);

  const updateHud = useCallback((updater: (hud: HudArtworkControls) => void) => {
    updateDoc(d => updater(d.hud));
  }, [updateDoc]);

  const ensurePreset = useCallback((draft: CardGameLayoutDocument) => {
    const key = String(resolvedPlayerCount);
    if (!draft.presets[key]) {
      draft.presets[key] = createLayoutPreset(resolvedPlayerCount);
    }
    return draft.presets[key];
  }, [resolvedPlayerCount]);

  const updateSeat = useCallback((seatId: number, updater: (seat: SeatLayout) => void) => {
    updateDoc(d => {
      const preset = ensurePreset(d);
      const seat = preset.seats.find(s => s.id === seatId);
      if (seat) updater(seat);
    });
  }, [updateDoc, ensurePreset]);

  const hud = document.hud;
  const variant = activeIndex >= 0 ? hud.buttonVariants?.[activeIndex] ?? { linked: true, overrides: {} } : null;
  const master = hud.button as HudButtonControls;
  const effective = activeIndex >= 0 && variant && !variant.linked ? { ...master, ...variant.overrides } : master;

  const selectedSeat = useMemo(
    () => selectedSeatId !== null ? activePreset.seats.find(s => s.id === selectedSeatId) ?? null : null,
    [activePreset.seats, selectedSeatId],
  );

  useEffect(() => {
    if (selectedSeatId !== null && activePreset.seats.some((seat) => seat.id === selectedSeatId)) {
      return;
    }
    tableLayoutStore.setSelectedSeat(activePreset.seats[0]?.id ?? null);
  }, [activePreset.seats, selectedSeatId]);

  const handleSeatSelection = useCallback((seatId: number | null) => {
    tableLayoutStore.setSelectedSeat(seatId);
  }, []);

  const handleResetSeatRing = useCallback(() => {
    updateDoc((draft) => {
      const preset = ensurePreset(draft);
      const freshPreset = createLayoutPreset(resolvedPlayerCount);
      preset.seats = freshPreset.seats;
    });
    tableLayoutStore.setSelectedSeat(0);
  }, [ensurePreset, resolvedPlayerCount, updateDoc]);

  const handleResetSelectedSeat = useCallback(() => {
    if (!selectedSeat) {
      return;
    }

    const freshSeat = createLayoutPreset(resolvedPlayerCount).seats.find((seat) => seat.id === selectedSeat.id);
    if (!freshSeat) {
      return;
    }

    updateSeat(selectedSeat.id, (seat) => {
      seat.position = { ...freshSeat.position };
      seat.rotation = freshSeat.rotation;
      seat.scale = freshSeat.scale;
    });
  }, [resolvedPlayerCount, selectedSeat, updateSeat]);

  const renderHudButtons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="game-screen__hud-button-modal-toolbar">
        <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--workspace">
          {HUD_BUTTON_SECTIONS.map((tab) => (
            <TabButton key={tab.key} compact active={activeSection === tab.key} onClick={() => setActiveSection(tab.key)}>
              {tab.label}
            </TabButton>
          ))}
          <div className="game-screen__hud-button-modal-drag-space" />
          <TabButton compact active={activeIndex === -1} onClick={() => setActiveIndex(-1)}>
            Master
          </TabButton>
          <div style={{ width: '4px' }} />
          {HUD_BUTTON_SLOTS.map((slot, index) => (
            <TabButton key={slot} compact active={activeIndex === index} onClick={() => setActiveIndex(index)}>
              {(hud.buttonLabels?.[index]) || slot}
            </TabButton>
          )).slice(0, hud.buttonCount ?? 6)}
        </div>
      </div>
      <div className="game-screen__hud-button-modal-content">
        {activeIndex >= 0 && (
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(141, 255, 176, 0.1)' }}>
            <CheckboxField 
              label="Linked to Master" 
              value={variant?.linked ?? true} 
              onChange={(v) => updateHud(h => {
                if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: true, overrides: {} };
                h.buttonVariants[activeIndex].linked = v;
                if (v) h.buttonVariants[activeIndex].overrides = {};
              })} 
            />
          </div>
        )}
        {activeSection === "layout" && (
          <Section title="Layout Configuration">
            <NumberField label="Button Scale" value={hud.buttonScale ?? 1} min={0.5} max={1.5} step={0.01} onChange={(v) => updateHud(h => { h.buttonScale = v; })} onReset={() => updateHud(h => { h.buttonScale = DEFAULT_HUD_ARTWORK_CONTROLS.buttonScale; })} />
            <NumberField label="Button Count" value={hud.buttonCount ?? 6} min={1} max={6} step={1} onChange={(v) => updateHud(h => { h.buttonCount = v; })} onReset={() => updateHud(h => { h.buttonCount = DEFAULT_HUD_ARTWORK_CONTROLS.buttonCount; })} />
            {activeIndex >= 0 && (
              <TextField 
                label={`Button ${HUD_BUTTON_SLOTS[activeIndex]} Label`} 
                value={hud.buttonLabels?.[activeIndex] ?? ""} 
                onChange={(v) => updateHud(h => {
                  const next = [...(h.buttonLabels || [])];
                  while (next.length <= activeIndex) next.push("");
                  next[activeIndex] = v;
                  h.buttonLabels = next;
                })} 
              />
            )}
            <NumberField label="Offset X" value={master.buttonOffsetX} min={-320} max={320} step={1} onChange={(v) => updateHud(h => { h.button.buttonOffsetX = v; })} onReset={() => updateHud(h => { h.button.buttonOffsetX = DEFAULT_HUD_BUTTON_CONTROLS.buttonOffsetX; })} />
            <NumberField label="Offset Y" value={master.buttonOffsetY} min={-180} max={180} step={1} onChange={(v) => updateHud(h => { h.button.buttonOffsetY = v; })} onReset={() => updateHud(h => { h.button.buttonOffsetY = DEFAULT_HUD_BUTTON_CONTROLS.buttonOffsetY; })} />
          </Section>
        )}
        {activeSection === "geometry" && (
          <Section title="Button Geometry">
            {(["width", "height", "radius", "sideInset", "dotInset", "dotGap", "fontSize"] as const).map(f => (
              <NumberField key={f} label={f} value={effective[f]} min={0} max={900} step={1} disabled={activeIndex >= 0 && (variant?.linked ?? true)} onReset={() => updateHud(h => {
                const val = DEFAULT_HUD_BUTTON_CONTROLS[f];
                if (activeIndex < 0) h.button[f] = val as never;
                else {
                  if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                  h.buttonVariants[activeIndex].overrides[f] = val as never;
                }
              })} onChange={(v) => updateHud(h => {
                if (activeIndex < 0) h.button[f] = v as never;
                else {
                  if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                  h.buttonVariants[activeIndex].linked = false;
                  h.buttonVariants[activeIndex].overrides[f] = v as never;
                }
              })} />
            ))}
          </Section>
        )}
        {activeSection === "effects" && (
          <Section title="Visual Effects">
            {(["hoverInsetExpand", "hoverClampGlowOpacity", "clickInsetExpand", "clickRingFlashOpacity"] as const).map(f => (
              <NumberField key={f} label={f} value={effective[f]} min={0} max={1} step={0.01} disabled={activeIndex >= 0 && (variant?.linked ?? true)} onChange={(v) => updateHud(h => {
                if (activeIndex < 0) h.button[f] = v as never;
                else {
                  if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                  h.buttonVariants[activeIndex].linked = false;
                  h.buttonVariants[activeIndex].overrides[f] = v as never;
                }
              })} />
            ))}
          </Section>
        )}
        {activeSection === "colors" && (
          <Section title="Colours & Styling">
            {(["textColor", "ringColor", "outerGlowColor", "midGlowColor", "dotGlowColor", "dotCoreColor"] as const).map(f => (
              <ColorField key={f} label={f} value={effective[f] as string} disabled={activeIndex >= 0 && (variant?.linked ?? true)} onChange={(v) => updateHud(h => {
                if (activeIndex < 0) h.button[f] = v as never;
                else {
                  if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                  h.buttonVariants[activeIndex].linked = false;
                  h.buttonVariants[activeIndex].overrides[f] = v as never;
                }
              })} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );

  const renderTableWorkspace = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PlayerCountSelector
        value={resolvedPlayerCount}
        min={boundedMinPlayerCount}
        max={boundedMaxPlayerCount}
        onChange={handlePlayerCountChange}
      />
      <div className="game-screen__hud-button-modal-tabs">
        {TABLE_SECTIONS.map(s => (
          <TabButton key={s.key} compact active={activeTableSection === s.key} onClick={() => setActiveTableSection(s.key)}>
            {s.label}
          </TabButton>
        ))}
      </div>
      <div className="game-screen__hud-button-modal-content">
        {activeTableSection === "shape" && (
          <Section title="Table Geometry">
            <NumberField label="Width" value={activePreset.table.width ?? 960} min={400} max={1800} step={1}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.width = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.width = DEFAULT_TABLE_SHAPE.width; })} />
            <NumberField label="Height" value={activePreset.table.height ?? 560} min={200} max={1000} step={1}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.height = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.height = DEFAULT_TABLE_SHAPE.height; })} />
            <NumberField label="Offset X" value={activePreset.table.offsetX ?? 0} min={-400} max={400} step={1}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.offsetX = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.offsetX = DEFAULT_TABLE_SHAPE.offsetX; })} />
            <NumberField label="Offset Y" value={activePreset.table.offsetY ?? 0} min={-400} max={400} step={1}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.offsetY = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.offsetY = DEFAULT_TABLE_SHAPE.offsetY; })} />
            <NumberField label="Curvature" value={activePreset.table.curvature ?? 0.88} min={0} max={1} step={0.01}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.curvature = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.curvature = DEFAULT_TABLE_SHAPE.curvature; })} />
            <ColorField label="Rim Color" value={activePreset.table.rimColor ?? "#22ff66"}
              onChange={(v) => updateDoc(d => { ensurePreset(d).table.rimColor = v; })}
              onReset={() => updateDoc(d => { ensurePreset(d).table.rimColor = "#22ff66"; })} />
          </Section>
        )}

        {activeTableSection === "seats" && (
          <>
            <Section title={`Seats — ${resolvedPlayerCount} players`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.72rem' }}>
                  Pick a preset count, then click a seat chip here or click a seat on the preview canvas.
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact"
                    onClick={handleResetSelectedSeat}
                    disabled={!selectedSeat}
                  >
                    Reset Selected
                  </button>
                  <button
                    type="button"
                    className="game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact"
                    onClick={handleResetSeatRing}
                  >
                    Regenerate Ring
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {activePreset.seats.map(seat => (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => handleSeatSelection(seat.id === selectedSeatId ? null : seat.id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: seat.id === selectedSeatId ? '#4ade80' : 'rgba(141,255,176,0.25)',
                      background: seat.id === selectedSeatId ? 'rgba(74,222,128,0.2)' : 'rgba(141,255,176,0.04)',
                      color: seat.id === selectedSeatId ? '#eaffed' : 'rgba(220,255,230,0.6)',
                      fontSize: '0.72rem',
                      fontWeight: seat.id === selectedSeatId ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {seat.label ?? `P${seat.id + 1}`}
                  </button>
                ))}
              </div>
              {selectedSeat ? (
                <>
                  <TextField 
                    label="Seat Label" 
                    value={selectedSeat.label ?? ""} 
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.label = v; })} 
                  />
                  <NumberField
                    label={`Seat ${selectedSeat.label ?? selectedSeat.id + 1} — X (0–1)`}
                    value={selectedSeat.position.x}
                    min={-0.5} max={1.5} step={0.001}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.position.x = Math.round(v * 10000) / 10000; })}
                  />
                  <NumberField
                    label={`Seat ${selectedSeat.label ?? selectedSeat.id + 1} — Y (0–1)`}
                    value={selectedSeat.position.y}
                    min={-0.5} max={1.5} step={0.001}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.position.y = Math.round(v * 10000) / 10000; })}
                  />
                  <NumberField
                    label="Rotation (°)"
                    value={selectedSeat.rotation}
                    min={-180} max={180} step={1}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.rotation = v; })}
                    onReset={() => updateSeat(selectedSeat.id, s => { s.rotation = 0; })}
                  />
                  <NumberField
                    label="Scale"
                    value={selectedSeat.scale ?? 0.5}
                    min={0.1} max={2} step={0.01}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.scale = v; })}
                    onReset={() => updateSeat(selectedSeat.id, s => { s.scale = 0.5; })}
                  />
                </>
              ) : (
                <div style={{ color: 'rgba(220,255,230,0.4)', fontSize: '0.75rem', paddingTop: '0.5rem' }}>
                  Select a seat above to edit its position, rotation, and scale.
                </div>
              )}
            </Section>
          </>
        )}

        {activeTableSection === "playerUi" && (
          <>
            <Section title="Global Defaults">
              <NumberField label="Overall Scale" value={document.playerUiDefaults.overallScale ?? 1} min={0.5} max={2.0} step={0.01}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.overallScale = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.overallScale = DEFAULT_PLAYER_UI_DEFAULTS.overallScale; })} />
              <NumberField label="Base Arc Rotation" value={document.playerUiDefaults.baseArcRotation ?? 0} min={-180} max={180} step={1}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.baseArcRotation = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.baseArcRotation = DEFAULT_PLAYER_UI_DEFAULTS.baseArcRotation; })} />
              <NumberField label="Info Box Angle" value={document.playerUiDefaults.infoBoxAngle ?? 180} min={0} max={360} step={1}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxAngle = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxAngle = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxAngle; })} />
              <NumberField label="Info Box Rotation" value={document.playerUiDefaults.infoBoxRotation ?? 0} min={-180} max={180} step={1}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxRotation = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxRotation = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxRotation; })} />
              <NumberField label="Label Text Offset" value={document.playerUiDefaults.labelTextOffset ?? 550} min={0} max={1200} step={1}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.labelTextOffset = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.labelTextOffset = DEFAULT_PLAYER_UI_DEFAULTS.labelTextOffset; })} />
              <NumberField label="Avatar Image Scale" value={document.playerUiDefaults.avatarImageScale ?? 1.2} min={0.2} max={3} step={0.01}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.avatarImageScale = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.avatarImageScale = DEFAULT_PLAYER_UI_DEFAULTS.avatarImageScale; })} />
              <ColorField label="Avatar Base Color" value={document.playerUiDefaults.avatarBaseColor ?? "#f0f0f0"}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = DEFAULT_PLAYER_UI_DEFAULTS.avatarBaseColor; })} />
              <ColorField label="Info Box Color" value={document.playerUiDefaults.infoBoxColor ?? "#003c78"}
                onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxColor = v; })}
                onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxColor = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxColor; })} />
            </Section>

            <Section title={`Per-Seat Overrides — ${resolvedPlayerCount} players`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {activePreset.seats.map(seat => (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => handleSeatSelection(seat.id === selectedSeatId ? null : seat.id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: seat.id === selectedSeatId ? '#4ade80' : 'rgba(141,255,176,0.25)',
                      background: seat.id === selectedSeatId
                        ? 'rgba(74,222,128,0.2)'
                        : seat.playerOverrides && Object.keys(seat.playerOverrides).length > 0
                          ? 'rgba(141,255,176,0.08)'
                          : 'rgba(141,255,176,0.04)',
                      color: seat.id === selectedSeatId ? '#eaffed' : 'rgba(220,255,230,0.6)',
                      fontSize: '0.72rem',
                      fontWeight: seat.id === selectedSeatId ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {seat.label ?? `P${seat.id + 1}`}
                    {seat.playerOverrides && Object.keys(seat.playerOverrides).length > 0 ? ' *' : ''}
                  </button>
                ))}
              </div>
              {selectedSeat ? (
                <>
                  <NumberField
                    label="Arc Rotation Override"
                    value={selectedSeat.playerOverrides?.baseArcRotation ?? (document.playerUiDefaults.baseArcRotation ?? 0)}
                    min={-180} max={180} step={1}
                    onChange={(v) => updateSeat(selectedSeat.id, s => {
                      s.playerOverrides = { ...s.playerOverrides, baseArcRotation: v };
                    })}
                    onReset={() => updateSeat(selectedSeat.id, s => {
                      if (s.playerOverrides) delete s.playerOverrides.baseArcRotation;
                    })}
                  />
                  <NumberField
                    label="Info Box Angle Override"
                    value={selectedSeat.playerOverrides?.infoBoxAngle ?? (document.playerUiDefaults.infoBoxAngle ?? 180)}
                    min={0} max={360} step={1}
                    onChange={(v) => updateSeat(selectedSeat.id, s => {
                      s.playerOverrides = { ...s.playerOverrides, infoBoxAngle: v };
                    })}
                    onReset={() => updateSeat(selectedSeat.id, s => {
                      if (s.playerOverrides) delete s.playerOverrides.infoBoxAngle;
                    })}
                  />
                  <NumberField
                    label="Info Box Rotation Override"
                    value={selectedSeat.playerOverrides?.infoBoxRotation ?? (document.playerUiDefaults.infoBoxRotation ?? 0)}
                    min={-180} max={180} step={1}
                    onChange={(v) => updateSeat(selectedSeat.id, s => {
                      s.playerOverrides = { ...s.playerOverrides, infoBoxRotation: v };
                    })}
                    onReset={() => updateSeat(selectedSeat.id, s => {
                      if (s.playerOverrides) delete s.playerOverrides.infoBoxRotation;
                    })}
                  />
                  <div style={{ paddingTop: '0.25rem' }}>
                    <button
                      type="button"
                      style={{ fontSize: '0.7rem', color: 'rgba(255,100,100,0.7)', background: 'none', border: '1px solid rgba(255,100,100,0.2)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                      onClick={() => updateSeat(selectedSeat.id, s => { s.playerOverrides = undefined; })}
                    >
                      Clear all overrides
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: 'rgba(220,255,230,0.4)', fontSize: '0.75rem', paddingTop: '0.5rem' }}>
                  Select a seat above to edit its player UI overrides. Seats with overrides are marked with *.
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`game-screen__hud-button-modal ${embedded ? "design-studio--embedded" : ""}`}
      style={embedded ? {
        position: 'relative', inset: 'auto', width: '100%', height: '100%', border: 'none',
        borderRadius: 0, boxShadow: 'none', display: 'flex', flexDirection: 'column',
        background: 'transparent',
      } : {}}
    >
      <div className="game-screen__hud-button-modal-tabs">
        {WORKSPACE_TABS.map((tab) => (
          <TabButton key={tab.key} active={workspaceSection === tab.key} onClick={() => setWorkspaceSection(tab.key)}>
            {tab.label}
          </TabButton>
        ))}
      </div>
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {workspaceSection === "hudButtons" && renderHudButtons()}
        {workspaceSection === "layerSplit" && (
          <div className="game-screen__hud-button-modal-content">
            <Section title="Layer Visibility Controls">
              <div className="game-screen__hud-button-label-grid">
                {LAYER_OPTIONS.map(o => (
                  <label key={o.key} className="game-screen__hud-button-label-line" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={(document.hud.layerVisibility?.[o.key]) ?? true} onChange={() => updateHud(h => {
                      const next = { ...(h.layerVisibility || {}) };
                      next[o.key] = !(next[o.key] ?? true);
                      h.layerVisibility = next;
                    })} />
                    <span className="game-screen__hud-button-field-label">{o.label}</span>
                  </label>
                ))}
              </div>
            </Section>
          </div>
        )}
        {workspaceSection === "hudTuning" && (
          <div className="game-screen__hud-button-modal-content">
            <Section title="HUD Base Art Styling">
              <NumberField label="HUD Width" value={hud.width} min={400} max={1800} step={1} onChange={(v) => updateHud(h => { h.width = v; })} onReset={() => updateHud(h => { h.width = DEFAULT_HUD_ARTWORK_CONTROLS.width; })} />
              <NumberField label="HUD Height" value={hud.height} min={100} max={600} step={1} onChange={(v) => updateHud(h => { h.height = v; })} onReset={() => updateHud(h => { h.height = DEFAULT_HUD_ARTWORK_CONTROLS.height; })} />
              <NumberField label="Offset X" value={hud.hudOffsetX} min={-400} max={400} step={1} onChange={(v) => updateHud(h => { h.hudOffsetX = v; })} onReset={() => updateHud(h => { h.hudOffsetX = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetX; })} />
              <NumberField label="Offset Y" value={hud.hudOffsetY} min={-400} max={400} step={1} onChange={(v) => updateHud(h => { h.hudOffsetY = v; })} onReset={() => updateHud(h => { h.hudOffsetY = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetY; })} />
              <NumberField label="Overall Scale" value={hud.overallScale} min={0.2} max={2.0} step={0.01} onChange={(v) => updateHud(h => { h.overallScale = v; })} onReset={() => updateHud(h => { h.overallScale = DEFAULT_HUD_ARTWORK_CONTROLS.overallScale; })} />
              <ColorField label="Panel Top" value={hud.panelTop} onChange={(v) => updateHud(h => { h.panelTop = v; })} onReset={() => updateHud(h => { h.panelTop = DEFAULT_HUD_ARTWORK_CONTROLS.panelTop; })} />
              <ColorField label="Panel Mid" value={hud.panelMid} onChange={(v) => updateHud(h => { h.panelMid = v; })} onReset={() => updateHud(h => { h.panelMid = DEFAULT_HUD_ARTWORK_CONTROLS.panelMid; })} />
              <ColorField label="Panel Bottom" value={hud.panelBottom} onChange={(v) => updateHud(h => { h.panelBottom = v; })} onReset={() => updateHud(h => { h.panelBottom = DEFAULT_HUD_ARTWORK_CONTROLS.panelBottom; })} />
              <NumberField label="Glass Opacity" value={hud.panelGlassOpacity} min={0} max={1} step={0.01} onChange={(v) => updateHud(h => { h.panelGlassOpacity = v; })} onReset={() => updateHud(h => { h.panelGlassOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.panelGlassOpacity; })} />
            </Section>
          </div>
        )}
        {workspaceSection === "table" && renderTableWorkspace()}
        {workspaceSection === "cardVisuals" && (
          <div className="game-screen__hud-button-modal-content">
            <Section title="Card Graphics">
              <NumberField label="Float Scale" value={document.cardVisuals.floatScale ?? 1} min={0.5} max={3.0} step={0.1} onChange={(v) => updateDoc(d => { d.cardVisuals.floatScale = v; })} onReset={() => updateDoc(d => { d.cardVisuals.floatScale = DEFAULT_CARD_VISUAL_CONTROLS.floatScale; })} />
            </Section>
          </div>
        )}
        {workspaceSection === "cardInHand" && (
          <div className="game-screen__hud-button-modal-content">
            <Section title="Card Fan Layout">
              <NumberField label="Card Count" value={document.cardFan.cardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.cardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.cardCount = DEFAULT_CARD_FAN_CONTROLS.cardCount; })} />
              <NumberField label="Min Cards" value={document.cardFan.minCardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.minCardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.minCardCount = DEFAULT_CARD_FAN_CONTROLS.minCardCount; })} />
              <NumberField label="Max Cards" value={document.cardFan.maxCardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.maxCardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.maxCardCount = DEFAULT_CARD_FAN_CONTROLS.maxCardCount; })} />
              <NumberField label="Orbit Radius" value={document.cardFan.radiusScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.radiusScale = v; })} onReset={() => updateDoc(d => { d.cardFan.radiusScale = DEFAULT_CARD_FAN_CONTROLS.radiusScale; })} />
              <NumberField label="Radius Offset" value={document.cardFan.radiusOffset} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.radiusOffset = v; })} onReset={() => updateDoc(d => { d.cardFan.radiusOffset = DEFAULT_CARD_FAN_CONTROLS.radiusOffset; })} />
              <NumberField label="Width Scale" value={document.cardFan.cardWidthScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.cardWidthScale = v; })} onReset={() => updateDoc(d => { d.cardFan.cardWidthScale = DEFAULT_CARD_FAN_CONTROLS.cardWidthScale; })} />
              <NumberField label="Arc Min" value={document.cardFan.arcMin} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMin = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMin = DEFAULT_CARD_FAN_CONTROLS.arcMin; })} />
              <NumberField label="Arc Max" value={document.cardFan.arcMax} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMax = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMax = DEFAULT_CARD_FAN_CONTROLS.arcMax; })} />
              <NumberField label="Fan Tilt" value={document.cardFan.fanTilt} min={-90} max={90} step={1} onChange={(v) => updateDoc(d => { d.cardFan.fanTilt = v; })} onReset={() => updateDoc(d => { d.cardFan.fanTilt = DEFAULT_CARD_FAN_CONTROLS.fanTilt; })} />
              <NumberField label="Offset X" value={document.cardFan.centerOffsetX} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetX = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetX = DEFAULT_CARD_FAN_CONTROLS.centerOffsetX; })} />
              <NumberField label="Offset Y" value={document.cardFan.centerOffsetY} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetY = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetY = DEFAULT_CARD_FAN_CONTROLS.centerOffsetY; })} />
              <CheckboxField label="Disable Viewport Scale" value={document.cardFan.disableViewportScale} onChange={(v) => updateDoc(d => { d.cardFan.disableViewportScale = v; })} />
            </Section>
          </div>
        )}
      </main>
    </div>
  );
};

export default CardGameDesignStudio;
