import React, { useState, useMemo, useCallback, type ReactNode } from "react";
import type { 
  CardGameLayoutDocument,
} from "@ocentra/game-ui-types/cardGameLayoutTypes";
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
  createLayoutPreset 
} from "@ocentra/game-layout-domain/cardGameLayoutRuntime";

// --- Types ---

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
  embedded?: boolean;
}

// --- Constants ---

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

// --- Internal UI Components ---

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

// --- The Actual Plugin Component ---

export const CardGameDesignStudio: React.FC<CardGameDesignStudioProps> = (props) => {
  const { document, onChange, initialWorkspaceSection, activePlayerCount, embedded = false } = props;

  // Local UI state
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSectionKey>(initialWorkspaceSection ?? "hudButtons");
  const [activeSection, setActiveSection] = useState<EditorSectionKey>("layout");
  const [activeTableSection, setActiveTableSection] = useState<TableSectionKey>("shape");
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const resolvedPlayerCount = activePlayerCount ?? document.defaultPlayerCount;
  const activePreset = useMemo(() => document.presets[String(resolvedPlayerCount)] ?? createLayoutPreset(resolvedPlayerCount), [document, resolvedPlayerCount]);

  // Document Helpers
  const updateDoc = useCallback((updater: (draft: CardGameLayoutDocument) => void) => {
    const next = cloneCardGameLayoutDocument(document);
    updater(next);
    onChange(next);
  }, [document, onChange]);

  const updateHud = useCallback((updater: (hud: HudArtworkControls) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateDoc(d => updater(d.hud as any));
  }, [updateDoc]);

  // Derived state from document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hud = document.hud as any;
  const variant = activeIndex >= 0 ? hud.buttonVariants?.[activeIndex] ?? { linked: true, overrides: {} } : null;
  const master = hud.button as HudButtonControls;
  const effective = activeIndex >= 0 && variant && !variant.linked ? { ...master, ...variant.overrides } : master;

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
            {HUD_BUTTON_SLOTS.map((slot, index) => (
              <TabButton key={slot} compact active={activeIndex === index} onClick={() => setActiveIndex(index)}>
                {(hud.buttonLabels?.[index]) || slot}
              </TabButton>
            )).slice(0, hud.buttonCount ?? 6)}
          </div>
      </div>
      <div className="game-screen__hud-button-modal-content">
         {activeSection === "layout" && (
           <Section title="Layout Configuration">
               <NumberField label="Button Scale" value={hud.buttonScale ?? 1} min={0.5} max={1.5} step={0.01} onChange={(v) => updateHud(h => { h.buttonScale = v; })} onReset={() => updateHud(h => { h.buttonScale = DEFAULT_HUD_ARTWORK_CONTROLS.buttonScale; })} />
              <NumberField label="Button Count" value={hud.buttonCount ?? 6} min={1} max={6} step={1} onChange={(v) => updateHud(h => { h.buttonCount = v; })} onReset={() => updateHud(h => { h.buttonCount = DEFAULT_HUD_ARTWORK_CONTROLS.buttonCount; })} />
              <NumberField label="Offset X" value={master.buttonOffsetX} min={-320} max={320} step={1} onChange={(v) => updateHud(h => { h.button.buttonOffsetX = v; })} onReset={() => updateHud(h => { h.button.buttonOffsetX = DEFAULT_HUD_BUTTON_CONTROLS.buttonOffsetX; })} />
              <NumberField label="Offset Y" value={master.buttonOffsetY} min={-180} max={180} step={1} onChange={(v) => updateHud(h => { h.button.buttonOffsetY = v; })} onReset={() => updateHud(h => { h.button.buttonOffsetY = DEFAULT_HUD_BUTTON_CONTROLS.buttonOffsetY; })} />
           </Section>
         )}
         {activeSection === "geometry" && (
           <Section title="Button Geometry">
              {(["width", "height", "radius", "sideInset", "dotInset", "dotGap", "fontSize"] as const).map(f => (
                <NumberField key={f} label={f} value={(effective as any)[f]} min={0} max={900} step={1} onReset={() => updateHud(h => {
                   const val = (DEFAULT_HUD_BUTTON_CONTROLS as any)[f];
                   if (activeIndex < 0) (h.button as any)[f] = val;
                   else {
                      if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                      (h.buttonVariants[activeIndex].overrides as any)[f] = val;
                   }
                })} onChange={(v) => updateHud(h => { 
                   if (activeIndex < 0) (h.button as any)[f] = v;
                   else {
                      if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                      h.buttonVariants[activeIndex].linked = false;
                      (h.buttonVariants[activeIndex].overrides as any)[f] = v;
                   }
                })} />
              ))}
           </Section>
         )}
         {activeSection === "effects" && (
           <Section title="Visual Effects">
              {(["hoverInsetExpand", "hoverClampGlowOpacity", "clickInsetExpand", "clickRingFlashOpacity"] as const).map(f => (
                <NumberField key={f} label={f} value={(effective as any)[f]} min={0} max={1} step={0.01} onChange={(v) => updateHud(h => { 
                   if (activeIndex < 0) (h.button as any)[f] = v;
                   else {
                      if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                      h.buttonVariants[activeIndex].linked = false;
                      (h.buttonVariants[activeIndex].overrides as any)[f] = v;
                   }
                })} />
              ))}
           </Section>
         )}
         {activeSection === "colors" && (
           <Section title="Colours & Styling">
              {(["textColor", "ringColor", "outerGlowColor", "midGlowColor", "dotGlowColor", "dotCoreColor"] as const).map(f => (
                <ColorField key={f} label={f} value={(effective as any)[f]} onChange={(v) => updateHud(h => { 
                   if (activeIndex < 0) (h.button as any)[f] = v;
                   else {
                      if (!h.buttonVariants[activeIndex]) h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
                      h.buttonVariants[activeIndex].linked = false;
                      (h.buttonVariants[activeIndex].overrides as any)[f] = v;
                   }
                })} />
              ))}
           </Section>
         )}
      </div>
    </div>
  );

  return (
    <div className={`game-screen__hud-button-modal ${embedded ? "design-studio--embedded" : ""}`} 
      style={embedded ? { 
        position: 'relative', inset: 'auto', width: '100%', height: '100%', border: 'none', 
        borderRadius: 0, boxShadow: 'none', display: 'flex', flexDirection: 'column',
        background: 'transparent'
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
                         <input type="checkbox" checked={((document.hud as any).layerVisibility?.[o.key]) ?? true} onChange={() => updateHud(h => {
                           const next = {...((h as any).layerVisibility || {})};
                           next[o.key] = !(next[o.key] ?? true);
                           (h as any).layerVisibility = next;
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
          {workspaceSection === "table" && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                       <NumberField label="Width" value={activePreset.table.width ?? 960} min={400} max={1800} step={1} onChange={(v) => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.width = v; })} onReset={() => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.width = DEFAULT_TABLE_SHAPE.width; })} />
                       <NumberField label="Height" value={activePreset.table.height ?? 560} min={200} max={1000} step={1} onChange={(v) => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.height = v; })} onReset={() => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.height = DEFAULT_TABLE_SHAPE.height; })} />
                       <ColorField label="Border Color" value={activePreset.table.rimColor ?? "#22ff66"} onChange={(v) => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.rimColor = v; })} onReset={() => updateDoc(d => { d.presets[String(resolvedPlayerCount)].table.rimColor = "#22ff66"; })} />
                    </Section>
                  )}
                  {activeTableSection === "seats" && (
                    <Section title="Seat Layout">
                       <NumberField label="Default Count" value={document.defaultPlayerCount} min={2} max={12} step={1} onChange={(v) => updateDoc(d => { d.defaultPlayerCount = v; })} onReset={() => updateDoc(d => { d.defaultPlayerCount = 4; })} />
                    </Section>
                  )}
                  {activeTableSection === "playerUi" && (
                    <Section title="Player UI Tokens">
                       <NumberField label="Overall Scale" value={document.playerUiDefaults.overallScale ?? 1} min={0.5} max={2.0} step={0.01} onChange={(v) => updateDoc(d => { d.playerUiDefaults.overallScale = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.overallScale = DEFAULT_PLAYER_UI_DEFAULTS.overallScale; })} />
                       <ColorField label="Avatar Base" value={document.playerUiDefaults.avatarBaseColor ?? "#00ff66"} onChange={(v) => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = DEFAULT_PLAYER_UI_DEFAULTS.avatarBaseColor; })} />
                    </Section>
                  )}
               </div>
            </div>
          )}
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
                    <NumberField label="Orbit Radius" value={document.cardFan.radiusScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.radiusScale = v; })} onReset={() => updateDoc(d => { d.cardFan.radiusScale = DEFAULT_CARD_FAN_CONTROLS.radiusScale; })} />
                    <NumberField label="Width Scale" value={document.cardFan.cardWidthScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.cardWidthScale = v; })} onReset={() => updateDoc(d => { d.cardFan.cardWidthScale = DEFAULT_CARD_FAN_CONTROLS.cardWidthScale; })} />
                    <NumberField label="Arc Min" value={document.cardFan.arcMin} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMin = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMin = DEFAULT_CARD_FAN_CONTROLS.arcMin; })} />
                    <NumberField label="Arc Max" value={document.cardFan.arcMax} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMax = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMax = DEFAULT_CARD_FAN_CONTROLS.arcMax; })} />
                    <NumberField label="Fan Tilt" value={document.cardFan.fanTilt} min={-90} max={90} step={1} onChange={(v) => updateDoc(d => { d.cardFan.fanTilt = v; })} onReset={() => updateDoc(d => { d.cardFan.fanTilt = DEFAULT_CARD_FAN_CONTROLS.fanTilt; })} />
                    <NumberField label="Offset X" value={document.cardFan.centerOffsetX} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetX = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetX = DEFAULT_CARD_FAN_CONTROLS.centerOffsetX; })} />
                    <NumberField label="Offset Y" value={document.cardFan.centerOffsetY} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetY = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetY = DEFAULT_CARD_FAN_CONTROLS.centerOffsetY; })} />
                </Section>
             </div>
          )}
       </main>
    </div>
  );
};

export default CardGameDesignStudio;
