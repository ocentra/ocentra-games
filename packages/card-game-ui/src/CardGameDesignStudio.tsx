import React, { useState, useMemo, useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type {
  CardGameEditorOverlayVisibility,
  CardGameCardStripControls,
  CardGameCardStripSlotControls,
  CardGameDeckTrayControls,
  CardGameDeckTrayImageFit,
  CardGameLayerKey,
  CardGameLayerVisibility,
  CardGameLayoutDocument,
  CardGameScoreboardControls,
  CardGameScoreboardIcon,
  CardGameScoreboardRowControls,
  PlainCardFrameSettings,
  CardGameStageFitMode,
  TableZone,
  TableZoneType,
} from "@ocentra/game-ui-types/cardGameLayoutTypes";
import {
  createCardGameEditorIsolationVisibility,
  createCardGameEditorOverlayVisibility,
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
  DEFAULT_CARD_STRIP_CONTROLS,
  DEFAULT_DECK_TRAY_CONTROLS,
  DEFAULT_RENDER_TOGGLES,
  DEFAULT_SCOREBOARD_CONTROLS,
  DEFAULT_STAGE_LAYOUT,
  DEFAULT_TABLE_ATTACHMENTS,
  DEFAULT_TABLE_PRESENTATION,
  cloneCardGameLayoutDocument,
  createDefaultCardGameLayoutDocument,
  createLayoutPreset,
  seedLayoutPresetFromSource,
  PLAIN_CARD_FRAME_DEFAULTS,
} from "@ocentra/game-layout-domain/cardGameLayoutRuntime";
import { tableLayoutStore } from "@ocentra/game-layout-domain/tableLayoutStore";
import { PlainCardFrame } from "./scene/PlainCardFrame";
import { resolveHudButtonGeometry } from "./scene/hudButtonGeometry";

export type WorkspaceSectionKey = "layerSplit" | "shell" | "hudTuning" | "table" | "scoreboard" | "cardStrip" | "deckTray" | "cardVisuals";
type EditorSectionKey = "layout" | "geometry" | "effects" | "colors";
type TableSectionKey = "placement" | "shape" | "seats" | "playerUi" | "attachments" | "zones";
type ScoreboardSectionKey = "frame" | "header" | "table";
type CardStripSectionKey = "layout" | "slots";
type DeckTraySectionKey = "deck" | "tray" | "image" | "style";
type LayerKey = CardGameLayerKey;
type EditorIsolationTreeNode = {
  label: string;
  key?: LayerKey;
  children?: EditorIsolationTreeNode[];
};
type ActionButtonTone = "default" | "danger";
type ActionBarItem = {
  label: string;
  onClick: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
};

export interface CardGameDesignStudioProps {
  document: CardGameLayoutDocument;
  onChange: (next: CardGameLayoutDocument) => void;
  initialWorkspaceSection?: WorkspaceSectionKey;
  activePlayerCount?: number;
  onActivePlayerCountChange?: (count: number) => void;
  minPlayerCount?: number;
  maxPlayerCount?: number;
  embedded?: boolean;
  editorLayerVisibility?: CardGameLayerVisibility;
  onEditorLayerVisibilityChange?: (next: CardGameLayerVisibility) => void;
  editorOverlayVisibility?: CardGameEditorOverlayVisibility;
  onEditorOverlayVisibilityChange?: (next: CardGameEditorOverlayVisibility) => void;
}

const WORKSPACE_TABS: Array<{ key: WorkspaceSectionKey; label: string }> = [
  { key: "layerSplit", label: "Layer Split" },
  { key: "shell", label: "Shell" },
  { key: "hudTuning", label: "HUD System" },
  { key: "table", label: "Table" },
  { key: "scoreboard", label: "Scoreboard" },
  { key: "cardStrip", label: "Card Strip" },
  { key: "deckTray", label: "Deck Tray" },
  { key: "cardVisuals", label: "Card Visuals" },
];

const HUD_BUTTON_SECTIONS: Array<{ key: EditorSectionKey; label: string }> = [
  { key: "layout", label: "Layout" },
  { key: "geometry", label: "Geometry" },
  { key: "effects", label: "Effects" },
  { key: "colors", label: "Colours" },
];

const HUD_BUTTON_GEOMETRY_FIELDS = [
  { key: "width", label: "Body Width", min: 120, max: 1600, step: 1 },
  { key: "height", label: "Slot Height", min: 60, max: 500, step: 1 },
  { key: "bodyHeight", label: "Main Body Height", min: 40, max: 500, step: 1 },
  { key: "radius", label: "Corner Radius", min: 0, max: 250, step: 1 },
  { key: "sideInset", label: "Side Inset", min: -200, max: 200, step: 1 },
  { key: "dotInset", label: "Dot Inset", min: 0, max: 120, step: 1 },
  { key: "dotGap", label: "Dot Gap", min: 1, max: 80, step: 1 },
  { key: "fontSize", label: "Font Size", min: 8, max: 120, step: 1 },
] as const satisfies ReadonlyArray<{
  key: keyof HudButtonControls;
  label: string;
  min: number;
  max: number;
  step: number;
}>;

const HUD_BUTTON_COLOR_FIELDS = [
  { key: "textColor", label: "Text" },
  { key: "ringColor", label: "Ring" },
  { key: "clickRingFlashColor", label: "Click Ring" },
  { key: "outerGlowColor", label: "Outer Glow" },
  { key: "midGlowColor", label: "Mid Glow" },
  { key: "dotGlowColor", label: "Dot Glow" },
  { key: "dotCoreColor", label: "Dot Core" },
  { key: "sideStroke", label: "Side Stroke" },
  { key: "sideGlow", label: "Side Glow" },
  { key: "hoverClampGlowColor", label: "Hover Clamp Glow" },
  { key: "bodyCenter", label: "Body Center" },
  { key: "bodyMid", label: "Body Mid" },
  { key: "bodyEdge", label: "Body Edge" },
  { key: "sideFillTop", label: "Side Fill Top" },
  { key: "sideFillMid", label: "Side Fill Mid" },
  { key: "sideFillBottom", label: "Side Fill Bottom" },
  { key: "frontFillTop", label: "Clamp Fill Top" },
  { key: "frontFillMid", label: "Clamp Fill Mid" },
  { key: "frontFillBottom", label: "Clamp Fill Bottom" },
] as const satisfies ReadonlyArray<{
  key: keyof HudButtonControls;
  label: string;
}>;

const TABLE_SECTIONS: Array<{ key: TableSectionKey; label: string }> = [
  { key: "placement", label: "Placement" },
  { key: "shape", label: "Shape" },
  { key: "seats", label: "Seats" },
  { key: "playerUi", label: "Player UI" },
  { key: "attachments", label: "Attachments" },
  { key: "zones", label: "Zones" },
];

const STAGE_FIT_OPTIONS: Array<{ value: CardGameStageFitMode; label: string }> = [
  { value: "width", label: "Fit Width" },
  { value: "contain", label: "Contain" },
];

const STAGE_ANCHOR_X_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
];

const STAGE_ANCHOR_Y_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
];

const ZONE_TYPE_OPTIONS: Array<{ value: TableZoneType; label: string }> = [
  { value: "deck", label: "Deck" },
  { value: "pot", label: "Pot" },
  { value: "card", label: "Card" },
  { value: "list", label: "List" },
];

const SCOREBOARD_ICON_OPTIONS: Array<{ value: CardGameScoreboardIcon; label: string }> = [
  { value: "coin", label: "Coin" },
  { value: "pot", label: "Pot" },
  { value: "none", label: "None" },
];

const DECK_TRAY_IMAGE_FIT_OPTIONS: Array<{ value: CardGameDeckTrayImageFit; label: string }> = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
];

const DEFAULT_SCOREBOARD_STAGE_BLOCK = DEFAULT_STAGE_LAYOUT.extraBlocks?.find((entry) => entry.kind === "scoreboard")
  ?? {
    kind: "scoreboard" as const,
    fitMode: "contain" as const,
    anchorX: "end" as const,
    anchorY: "start" as const,
    offsetX: 0,
    offsetY: 0,
    insetTop: 24,
    insetRight: 36,
    insetBottom: 0,
    insetLeft: 0,
    minScale: 0.28,
    maxScale: 1,
  };

const DEFAULT_CARD_STRIP_STAGE_BLOCK = DEFAULT_STAGE_LAYOUT.extraBlocks?.find((entry) => entry.kind === "cardStrip")
  ?? {
    kind: "cardStrip" as const,
    fitMode: "contain" as const,
    anchorX: "start" as const,
    anchorY: "start" as const,
    offsetX: 0,
    offsetY: 0,
    insetTop: 24,
    insetRight: 0,
    insetBottom: 0,
    insetLeft: 32,
    minScale: 0.25,
    maxScale: 1,
  };

const HUD_BUTTON_SLOTS = ["A", "B", "C", "D", "E", "F"];

const EDITOR_ISOLATION_TREE: EditorIsolationTreeNode[] = [
  { key: "background", label: "Background" },
  {
    label: "Shell",
    children: [
      { key: "header", label: "Header" },
      { key: "footer", label: "Footer" },
    ],
  },
  {
    key: "table",
    label: "Table",
    children: [
      { key: "seats", label: "Seats" },
      { key: "playerUi", label: "Player UI" },
      { key: "zones", label: "Zones" },
      {
        key: "deckTray",
        label: "Deck Tray",
        children: [
          { key: "deckTrayDeck", label: "Deck" },
        ],
      },
    ],
  },
  {
    key: "hud",
    label: "HUD",
    children: [
      { key: "cardFan", label: "Cards In Hand" },
    ],
  },
  { key: "scoreboard", label: "Scoreboard" },
  { key: "cardStrip", label: "Card Strip" },
];

const HUD_TUNING_SECTIONS = [
  { key: "base", label: "Base" },
  { key: "wings", label: "Wings" },
  { key: "dome", label: "Dome" },
  { key: "styles", label: "Styles" },
  { key: "buttons", label: "Buttons" },
  { key: "cardInHand", label: "Card Fan" },
] as const;

const CARD_STRIP_SECTIONS: Array<{ key: CardStripSectionKey; label: string }> = [
  { key: "layout", label: "Layout" },
  { key: "slots", label: "Slots" },
];

const DECK_TRAY_SECTIONS: Array<{ key: DeckTraySectionKey; label: string }> = [
  { key: "deck", label: "Deck" },
  { key: "tray", label: "Tray" },
  { key: "image", label: "Image" },
  { key: "style", label: "Style" },
];

function collectIsolationKeys(nodes: EditorIsolationTreeNode[]): LayerKey[] {
  const keys: LayerKey[] = [];
  const visit = (node: EditorIsolationTreeNode) => {
    if (node.key) {
      keys.push(node.key);
    }
    node.children?.forEach(visit);
  };
  nodes.forEach(visit);
  return keys;
}

const EDITOR_ISOLATION_KEYS = collectIsolationKeys(EDITOR_ISOLATION_TREE);

const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 10;
const DEFAULT_LAYOUT_DOCUMENT = createDefaultCardGameLayoutDocument();
const DEFAULT_ZONES = DEFAULT_LAYOUT_DOCUMENT.zones ?? [];

function createDefaultEditorOverlayState(): CardGameEditorOverlayVisibility {
  return createCardGameEditorOverlayVisibility();
}

function createScoreboardRowDefaults(
  scoreboard: CardGameScoreboardControls,
  index: number,
): CardGameScoreboardRowControls {
  return {
    id: `row_${index + 1}`,
    icon: "coin",
    label: "NEW",
    value: "0",
    iconX: scoreboard.iconX,
    iconY: scoreboard.iconOffsetY,
    iconSize: scoreboard.iconSize,
    labelX: scoreboard.labelOffsetX,
    labelTextSize: scoreboard.labelTextSize,
    valueTextSize: scoreboard.valueTextSize,
    textY: scoreboard.rowTextYOffset,
    coinDollarFontSize: scoreboard.coinDollarFontSize,
    coinDollarTextLength: scoreboard.coinDollarTextLength,
    coinDollarY: scoreboard.coinDollarY,
    coinDollarStrokeWidth: scoreboard.coinDollarStrokeWidth,
  };
}

function createCardStripSlotDefaults(index: number): CardGameCardStripSlotControls {
  return {
    id: `slot_${index + 1}`,
    label: `Slot ${index + 1}`,
    previewFaceUp: false,
    previewText: "",
  };
}

function cloneZones(zones: TableZone[]): TableZone[] {
  return zones.map((zone) => ({
    ...zone,
    position: { ...zone.position },
    size: zone.size ? { ...zone.size } : undefined,
  }));
}

function cloneScoreboardRows(rows: CardGameScoreboardRowControls[]): CardGameScoreboardRowControls[] {
  return rows.map((row) => ({ ...row }));
}

function cloneCardStripSlots(slots: CardGameCardStripSlotControls[]): CardGameCardStripSlotControls[] {
  return slots.map((slot) => ({ ...slot }));
}

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
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset} title="Reset to default" style={{ flex: '0 0 auto', minWidth: '2.5rem', height: '1.4rem', fontSize: '0.7rem', padding: '0 0.4rem' }}>
            Reset
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
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset} title="Reset to default" style={{ flex: '0 0 auto', minWidth: '2.5rem', height: '1.4rem', fontSize: '0.7rem', padding: '0 0.4rem' }}>
            Reset
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

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (next: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}</span>
        <select
          className="game-screen__hud-button-field-number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

function IsolationTreeNodeRow({
  node,
  visibility,
  onToggle,
  depth = 0,
}: {
  node: EditorIsolationTreeNode;
  visibility: CardGameLayerVisibility;
  onToggle: (key: LayerKey) => void;
  depth?: number;
}) {
  const isChecked = node.key ? visibility[node.key] ?? true : undefined;
  const hasChildren = Boolean(node.children?.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div
        style={{
          marginLeft: `${depth * 0.95}rem`,
          padding: "0.45rem 0.6rem",
          borderRadius: "0.7rem",
          border: "1px solid rgba(141,255,176,0.16)",
          background: hasChildren ? "rgba(141,255,176,0.05)" : "rgba(141,255,176,0.02)",
        }}
      >
        {node.key ? (
          <label
            className="game-screen__hud-button-label-line"
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggle(node.key!)}
            />
            <span className="game-screen__hud-button-field-label">{node.label}</span>
          </label>
        ) : (
          <div
            style={{
              color: "rgba(220,255,230,0.72)",
              fontSize: "0.74rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {node.label}
          </div>
        )}
      </div>
      {node.children?.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {node.children.map((child) => (
            <IsolationTreeNodeRow
              key={`${node.key ?? node.label}-${child.key ?? child.label}`}
              node={child}
              visibility={visibility}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
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
    <button
      type="button"
      className={`game-screen__hud-button-modal-tab ${compact ? "game-screen__hud-button-modal-tab--compact" : ""} ${active ? "game-screen__hud-button-modal-tab--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionBar({ actions }: { actions: ActionBarItem[] }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="game-screen__hud-button-modal-tab"
          onClick={action.onClick}
          disabled={action.disabled}
          style={action.tone === "danger"
            ? {
              borderColor: "rgba(255,100,100,0.45)",
              color: "#ffb3b3",
              background: "rgba(255,64,64,0.12)",
            }
            : undefined}
        >
          {action.label}
        </button>
      ))}
    </div>
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
    editorLayerVisibility,
    onEditorLayerVisibilityChange,
    editorOverlayVisibility,
    onEditorOverlayVisibilityChange,
  } = props;

  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSectionKey>(initialWorkspaceSection ?? "hudTuning");
  const [activeSection, setActiveSection] = useState<EditorSectionKey>("layout");
  const [activeTableSection, setActiveTableSection] = useState<TableSectionKey>("placement");
  const [activeScoreboardSection, setActiveScoreboardSection] = useState<ScoreboardSectionKey>("frame");
  const [activeCardStripSection, setActiveCardStripSection] = useState<CardStripSectionKey>("layout");
  const [activeDeckTraySection, setActiveDeckTraySection] = useState<DeckTraySectionKey>("deck");
  const [hudTuningSection, setHudTuningSection] = useState<"base" | "wings" | "dome" | "styles" | "buttons" | "cardInHand">("base");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedScoreboardRowId, setSelectedScoreboardRowId] = useState<string | null>(null);
  const [selectedCardStripSlotId, setSelectedCardStripSlotId] = useState<string | null>(null);
  const [internalEditorLayerVisibility, setInternalEditorLayerVisibility] = useState<CardGameLayerVisibility>(
    () => createCardGameEditorIsolationVisibility(),
  );
  const [internalEditorOverlayVisibility, setInternalEditorOverlayVisibility] = useState<CardGameEditorOverlayVisibility>(
    () => createDefaultEditorOverlayState(),
  );
  const [internalPlayerCount, setInternalPlayerCount] = useState<number>(activePlayerCount ?? document.defaultPlayerCount);
  const boundedMinPlayerCount = Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, minPlayerCount));
  const boundedMaxPlayerCount = Math.max(boundedMinPlayerCount, Math.min(MAX_PLAYER_COUNT, maxPlayerCount));
  const resolvedPlayerCount = Math.max(
    boundedMinPlayerCount,
    Math.min(boundedMaxPlayerCount, activePlayerCount ?? internalPlayerCount),
  );
  const resolvedEditorLayerVisibility = editorLayerVisibility ?? internalEditorLayerVisibility;
  const resolvedEditorOverlayVisibility = editorOverlayVisibility ?? internalEditorOverlayVisibility;
  const selectedSeatId = useSyncExternalStore(
    tableLayoutStore.subscribe,
    () => tableLayoutStore.getState().selectedSeatId,
    () => tableLayoutStore.getState().selectedSeatId,
  );

  const activePreset = useMemo(
    () => document.presets[String(resolvedPlayerCount)] ?? createLayoutPreset(resolvedPlayerCount),
    [document, resolvedPlayerCount],
  );
  const stageLayout = document.stageLayout ?? DEFAULT_STAGE_LAYOUT;
  const renderToggles = document.renderToggles;
  const tablePresentation = document.tablePresentation;
  const deckTrayAttachment = document.tableAttachments.deckTray;
  const cardStrip = document.cardStrip;
  const deckTray = document.deckTray;
  const scoreboardStageBlock = stageLayout.extraBlocks?.find((block) => block.kind === "scoreboard")
    ?? DEFAULT_STAGE_LAYOUT.extraBlocks?.find((block) => block.kind === "scoreboard")
    ?? null;
  const resolvedScoreboardStageBlock = useMemo(() => ({
    ...DEFAULT_SCOREBOARD_STAGE_BLOCK,
    ...(scoreboardStageBlock ?? {}),
  }), [scoreboardStageBlock]);
  const cardStripStageBlock = stageLayout.extraBlocks?.find((block) => block.kind === "cardStrip")
    ?? DEFAULT_STAGE_LAYOUT.extraBlocks?.find((block) => block.kind === "cardStrip")
    ?? null;
  const zones = useMemo(() => document.zones ?? [], [document.zones]);

  const updateDoc = useCallback((updater: (draft: CardGameLayoutDocument) => void) => {
    const next = cloneCardGameLayoutDocument(document);
    updater(next);
    onChange(next);
  }, [document, onChange]);

  const updateEditorLayerVisibility = useCallback((updater: (draft: CardGameLayerVisibility) => void) => {
    const next = {
      ...resolvedEditorLayerVisibility,
    };
    updater(next);
    if (!editorLayerVisibility) {
      setInternalEditorLayerVisibility(next);
    }
    onEditorLayerVisibilityChange?.(next);
  }, [editorLayerVisibility, onEditorLayerVisibilityChange, resolvedEditorLayerVisibility]);

  const updateEditorOverlayVisibility = useCallback((updater: (draft: CardGameEditorOverlayVisibility) => void) => {
    const next = {
      ...resolvedEditorOverlayVisibility,
    };
    updater(next);
    if (!editorOverlayVisibility) {
      setInternalEditorOverlayVisibility(next);
    }
    onEditorOverlayVisibilityChange?.(next);
  }, [editorOverlayVisibility, onEditorOverlayVisibilityChange, resolvedEditorOverlayVisibility]);

  const handlePlayerCountChange = useCallback((count: number) => {
    const nextCount = Math.max(boundedMinPlayerCount, Math.min(boundedMaxPlayerCount, count));
    const targetKey = String(nextCount);
    if (!document.presets[targetKey]) {
      const sourcePreset =
        document.presets[String(resolvedPlayerCount)]
        ?? document.presets[String(Math.max(boundedMinPlayerCount, nextCount - 1))]
        ?? null;
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

  const updateScoreboard = useCallback((updater: (scoreboard: CardGameScoreboardControls) => void) => {
    updateDoc((draft) => updater(draft.scoreboard));
  }, [updateDoc]);

  const updateCardStrip = useCallback((updater: (cardStripControls: CardGameCardStripControls) => void) => {
    updateDoc((draft) => updater(draft.cardStrip));
  }, [updateDoc]);

  const updateDeckTray = useCallback((updater: (deckTrayControls: CardGameDeckTrayControls) => void) => {
    updateDoc((draft) => updater(draft.deckTray));
  }, [updateDoc]);

  const updateRenderToggles = useCallback((updater: (renderTogglesDraft: CardGameLayoutDocument['renderToggles']) => void) => {
    updateDoc((draft) => updater(draft.renderToggles));
  }, [updateDoc]);

  const updateTablePresentation = useCallback((updater: (tablePresentationDraft: CardGameLayoutDocument['tablePresentation']) => void) => {
    updateDoc((draft) => updater(draft.tablePresentation));
  }, [updateDoc]);

  const updateDeckTrayAttachment = useCallback((updater: (attachmentDraft: CardGameLayoutDocument['tableAttachments']['deckTray']) => void) => {
    updateDoc((draft) => updater(draft.tableAttachments.deckTray));
  }, [updateDoc]);

  const ensureStageLayout = useCallback((draft: CardGameLayoutDocument) => {
    if (!draft.stageLayout) {
      draft.stageLayout = cloneCardGameLayoutDocument({
        ...draft,
        stageLayout: DEFAULT_STAGE_LAYOUT,
      }).stageLayout;
    }
    return draft.stageLayout ?? DEFAULT_STAGE_LAYOUT;
  }, []);

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

  const updateStageLayout = useCallback((updater: (stage: NonNullable<CardGameLayoutDocument['stageLayout']>) => void) => {
    updateDoc((draft) => {
      const nextStageLayout = ensureStageLayout(draft);
      updater(nextStageLayout);
    });
  }, [ensureStageLayout, updateDoc]);

  const updateScoreboardStageBlock = useCallback((updater: (block: NonNullable<NonNullable<CardGameLayoutDocument['stageLayout']>['extraBlocks']>[number]) => void) => {
    updateStageLayout((stage) => {
      if (!stage.extraBlocks) {
        stage.extraBlocks = [];
      }
      let block = stage.extraBlocks.find((entry) => entry.kind === "scoreboard");
      if (!block) {
        block = { ...DEFAULT_SCOREBOARD_STAGE_BLOCK };
        stage.extraBlocks.push(block);
      }
      updater(block);
    });
  }, [updateStageLayout]);

  const updateCardStripStageBlock = useCallback((updater: (block: NonNullable<NonNullable<CardGameLayoutDocument['stageLayout']>['extraBlocks']>[number]) => void) => {
    updateStageLayout((stage) => {
      if (!stage.extraBlocks) {
        stage.extraBlocks = [];
      }
      let block = stage.extraBlocks.find((entry) => entry.kind === "cardStrip");
      if (!block) {
        block = { ...DEFAULT_CARD_STRIP_STAGE_BLOCK };
        stage.extraBlocks.push(block);
      }
      updater(block);
    });
  }, [updateStageLayout]);
  
  const updateCardFrame = useCallback((updater: (frame: PlainCardFrameSettings) => void) => {
    updateDoc((draft) => {
      if (!draft.cardFrame) {
        draft.cardFrame = { ...PLAIN_CARD_FRAME_DEFAULTS };
      }
      updater(draft.cardFrame);
    });
  }, [updateDoc]);

  const updateZone = useCallback((zoneId: string, updater: (zone: TableZone) => void) => {
    updateDoc((draft) => {
      if (!draft.zones) {
        draft.zones = [];
      }
      const zone = draft.zones.find((entry) => entry.id === zoneId);
      if (zone) {
        updater(zone);
      }
    });
  }, [updateDoc]);

  const updateScoreboardRow = useCallback((rowId: string, updater: (row: CardGameScoreboardRowControls) => void) => {
    updateDoc((draft) => {
      const row = draft.scoreboard.rows.find((entry) => entry.id === rowId);
      if (row) {
        updater(row);
      }
    });
  }, [updateDoc]);

  const updateCardStripSlot = useCallback((slotId: string, updater: (slot: CardGameCardStripSlotControls) => void) => {
    updateDoc((draft) => {
      const slot = draft.cardStrip.slots.find((entry) => entry.id === slotId);
      if (slot) {
        updater(slot);
      }
    });
  }, [updateDoc]);

  const hud = document.hud;
  const scoreboard = document.scoreboard;
  const variant = activeIndex >= 0 ? hud.buttonVariants?.[activeIndex] ?? { linked: true, overrides: {} } : null;
  const master = hud.button as HudButtonControls;
  const effective = activeIndex >= 0 && variant && !variant.linked ? { ...master, ...variant.overrides } : master;
  const effectiveHudButtonGeometry = resolveHudButtonGeometry(effective);

  const selectedSeat = useMemo(
    () => (selectedSeatId !== null ? activePreset.seats.find((seat) => seat.id === selectedSeatId) ?? null : null),
    [activePreset.seats, selectedSeatId],
  );
  const resolvedSelectedZoneId = selectedZoneId !== null && zones.some((zone) => zone.id === selectedZoneId)
    ? selectedZoneId
    : zones[0]?.id ?? null;
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === resolvedSelectedZoneId) ?? null,
    [resolvedSelectedZoneId, zones],
  );
  const resolvedSelectedCardStripSlotId = selectedCardStripSlotId !== null && cardStrip.slots.some((slot) => slot.id === selectedCardStripSlotId)
    ? selectedCardStripSlotId
    : cardStrip.slots[0]?.id ?? null;
  const selectedCardStripSlot = cardStrip.slots.find((slot) => slot.id === resolvedSelectedCardStripSlotId) ?? null;
  const resolvedSelectedScoreboardRowId = selectedScoreboardRowId !== null && scoreboard.rows.some((row) => row.id === selectedScoreboardRowId)
    ? selectedScoreboardRowId
    : scoreboard.rows[0]?.id ?? null;
  const selectedScoreboardRow = scoreboard.rows.find((row) => row.id === resolvedSelectedScoreboardRowId) ?? null;

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

  const copyJson = useCallback((payload: unknown) => {
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  }, []);

  const confirmBundleReset = useCallback((label: string, reset: () => void) => {
    if (typeof window !== "undefined") {
      const shouldReset = window.confirm(`Reset ${label} to defaults?`);
      if (!shouldReset) {
        return;
      }
    }
    reset();
  }, []);

  const toggleEditorIsolationLayer = useCallback((key: LayerKey) => {
    updateEditorLayerVisibility((next) => {
      next[key] = !(next[key] ?? true);
    });
  }, [updateEditorLayerVisibility]);

  const setAllEditorIsolationLayers = useCallback((visible: boolean) => {
    updateEditorLayerVisibility((next) => {
      EDITOR_ISOLATION_KEYS.forEach((key) => {
        next[key] = visible;
      });
    });
  }, [updateEditorLayerVisibility]);

  const resetEditorIsolationLayers = useCallback(() => {
    const defaults = createCardGameEditorIsolationVisibility();
    updateEditorLayerVisibility((next) => {
      Object.assign(next, defaults);
    });
  }, [updateEditorLayerVisibility]);

  const copyDeckTrayBundle = useCallback(() => {
    copyJson({
      deckTray: document.deckTray,
      attachment: document.tableAttachments.deckTray,
      renderToggles: {
        deckTray: document.renderToggles.deckTray,
      },
    });
  }, [copyJson, document.deckTray, document.renderToggles.deckTray, document.tableAttachments.deckTray]);

  const resetDeckTrayBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.deckTray = {
        ...DEFAULT_DECK_TRAY_CONTROLS,
      };
      draft.tableAttachments.deckTray = {
        position: { ...DEFAULT_TABLE_ATTACHMENTS.deckTray.position },
        size: { ...DEFAULT_TABLE_ATTACHMENTS.deckTray.size },
        scale: DEFAULT_TABLE_ATTACHMENTS.deckTray.scale,
        rotation: DEFAULT_TABLE_ATTACHMENTS.deckTray.rotation,
      };
      draft.renderToggles.deckTray = DEFAULT_RENDER_TOGGLES.deckTray;
    });
  }, [updateDoc]);

  const copyLayoutBundle = useCallback(() => {
    copyJson(cloneCardGameLayoutDocument(document));
  }, [copyJson, document]);

  const copyShellBundle = useCallback(() => {
    copyJson({
      renderToggles: {
        background: document.renderToggles.background,
        header: document.renderToggles.header,
        footer: document.renderToggles.footer,
      },
      authoredViewport: stageLayout.authoredViewport,
    });
  }, [copyJson, document.renderToggles.background, document.renderToggles.footer, document.renderToggles.header, stageLayout.authoredViewport]);

  const resetShellBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.renderToggles.background = DEFAULT_RENDER_TOGGLES.background;
      draft.renderToggles.header = DEFAULT_RENDER_TOGGLES.header;
      draft.renderToggles.footer = DEFAULT_RENDER_TOGGLES.footer;
      const nextStageLayout = ensureStageLayout(draft);
      nextStageLayout.authoredViewport = { ...DEFAULT_STAGE_LAYOUT.authoredViewport };
    });
  }, [ensureStageLayout, updateDoc]);

  const copyHudBundle = useCallback(() => {
    copyJson({
      hud: document.hud,
      cardFan: document.cardFan,
      stageBlock: stageLayout.hud,
      renderToggles: {
        hud: document.renderToggles.hud,
        cardFan: document.renderToggles.cardFan,
      },
    });
  }, [copyJson, document.cardFan, document.hud, document.renderToggles.cardFan, document.renderToggles.hud, stageLayout.hud]);

  const resetHudBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.hud = cloneCardGameLayoutDocument({
        ...draft,
        hud: DEFAULT_HUD_ARTWORK_CONTROLS,
      }).hud;
      draft.cardFan = { ...DEFAULT_CARD_FAN_CONTROLS };
      draft.renderToggles.hud = DEFAULT_RENDER_TOGGLES.hud;
      draft.renderToggles.cardFan = DEFAULT_RENDER_TOGGLES.cardFan;
      const nextStageLayout = ensureStageLayout(draft);
      nextStageLayout.hud = { ...DEFAULT_STAGE_LAYOUT.hud };
    });
  }, [ensureStageLayout, updateDoc]);

  const copyTableBundle = useCallback(() => {
    copyJson({
      table: activePreset.table,
      seats: activePreset.seats,
      playerUiDefaults: document.playerUiDefaults,
      zones: document.zones,
      tablePresentation: document.tablePresentation,
      tableAttachments: document.tableAttachments,
      deckTray: document.deckTray,
      stageBlock: stageLayout.arena,
      renderToggles: {
        table: document.renderToggles.table,
        seats: document.renderToggles.seats,
        playerUi: document.renderToggles.playerUi,
        zones: document.renderToggles.zones,
        deckTray: document.renderToggles.deckTray,
      },
    });
  }, [activePreset.seats, activePreset.table, copyJson, document.deckTray, document.playerUiDefaults, document.renderToggles.deckTray, document.renderToggles.playerUi, document.renderToggles.seats, document.renderToggles.table, document.renderToggles.zones, document.tableAttachments, document.tablePresentation, document.zones, stageLayout.arena]);

  const resetTableBundle = useCallback(() => {
    updateDoc((draft) => {
      const nextPreset = createLayoutPreset(resolvedPlayerCount);
      draft.presets[String(resolvedPlayerCount)] = nextPreset;
      draft.playerUiDefaults = { ...DEFAULT_PLAYER_UI_DEFAULTS };
      draft.tablePresentation = { ...DEFAULT_TABLE_PRESENTATION };
      draft.tableAttachments = {
        deckTray: {
          position: { ...DEFAULT_TABLE_ATTACHMENTS.deckTray.position },
          size: { ...DEFAULT_TABLE_ATTACHMENTS.deckTray.size },
          scale: DEFAULT_TABLE_ATTACHMENTS.deckTray.scale,
          rotation: DEFAULT_TABLE_ATTACHMENTS.deckTray.rotation,
        },
      };
      draft.deckTray = { ...DEFAULT_DECK_TRAY_CONTROLS };
      draft.zones = cloneZones(DEFAULT_ZONES);
      draft.renderToggles.table = DEFAULT_RENDER_TOGGLES.table;
      draft.renderToggles.seats = DEFAULT_RENDER_TOGGLES.seats;
      draft.renderToggles.playerUi = DEFAULT_RENDER_TOGGLES.playerUi;
      draft.renderToggles.zones = DEFAULT_RENDER_TOGGLES.zones;
      draft.renderToggles.deckTray = DEFAULT_RENDER_TOGGLES.deckTray;
      const nextStageLayout = ensureStageLayout(draft);
      nextStageLayout.arena = { ...DEFAULT_STAGE_LAYOUT.arena };
    });
    tableLayoutStore.setSelectedSeat(0);
    setSelectedZoneId(null);
  }, [ensureStageLayout, resolvedPlayerCount, updateDoc]);

  const copyScoreboardBundle = () => {
    copyJson({
      controls: scoreboard,
      stageBlock: resolvedScoreboardStageBlock,
      renderToggles: {
        scoreboard: document.renderToggles.scoreboard,
      },
    });
  };

  const resetScoreboardBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.scoreboard = cloneCardGameLayoutDocument({
        ...draft,
        scoreboard: DEFAULT_SCOREBOARD_CONTROLS,
      }).scoreboard;
      draft.renderToggles.scoreboard = DEFAULT_RENDER_TOGGLES.scoreboard;
      const nextStageLayout = ensureStageLayout(draft);
      if (!nextStageLayout.extraBlocks) {
        nextStageLayout.extraBlocks = [];
      }
      const nextBlock = nextStageLayout.extraBlocks.find((entry) => entry.kind === "scoreboard");
      if (nextBlock) {
        Object.assign(nextBlock, DEFAULT_SCOREBOARD_STAGE_BLOCK);
      } else {
        nextStageLayout.extraBlocks.push({ ...DEFAULT_SCOREBOARD_STAGE_BLOCK });
      }
    });
    setSelectedScoreboardRowId(null);
  }, [ensureStageLayout, updateDoc]);

  const copyCardStripBundle = useCallback(() => {
    copyJson({
      cardStrip: document.cardStrip,
      stageBlock: cardStripStageBlock ?? DEFAULT_CARD_STRIP_STAGE_BLOCK,
      renderToggles: {
        cardStrip: document.renderToggles.cardStrip,
      },
    });
  }, [cardStripStageBlock, copyJson, document.cardStrip, document.renderToggles.cardStrip]);

  const resetCardStripBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.cardStrip = cloneCardGameLayoutDocument({
        ...draft,
        cardStrip: DEFAULT_CARD_STRIP_CONTROLS,
      }).cardStrip;
      draft.renderToggles.cardStrip = DEFAULT_RENDER_TOGGLES.cardStrip;
      const nextStageLayout = ensureStageLayout(draft);
      if (!nextStageLayout.extraBlocks) {
        nextStageLayout.extraBlocks = [];
      }
      const nextBlock = nextStageLayout.extraBlocks.find((entry) => entry.kind === "cardStrip");
      if (nextBlock) {
        Object.assign(nextBlock, DEFAULT_CARD_STRIP_STAGE_BLOCK);
      } else {
        nextStageLayout.extraBlocks.push({ ...DEFAULT_CARD_STRIP_STAGE_BLOCK });
      }
    });
    setSelectedCardStripSlotId(null);
  }, [ensureStageLayout, updateDoc]);

  const copyCardVisualsBundle = useCallback(() => {
    copyJson({
      cardVisuals: document.cardVisuals,
      cardFrame: document.cardFrame,
    });
  }, [copyJson, document.cardFrame, document.cardVisuals]);

  const resetCardVisualsBundle = useCallback(() => {
    updateDoc((draft) => {
      draft.cardVisuals = { ...DEFAULT_CARD_VISUAL_CONTROLS };
      draft.cardFrame = { ...PLAIN_CARD_FRAME_DEFAULTS };
    });
  }, [updateDoc]);

  const setHudButtonField = useCallback((field: keyof HudButtonControls, value: number | string | undefined) => {
    updateHud((h) => {
      if (activeIndex < 0) {
        if (value === undefined) {
          delete h.button[field];
        } else {
          h.button[field] = value as never;
        }
        return;
      }

      if (!h.buttonVariants[activeIndex]) {
        h.buttonVariants[activeIndex] = { linked: false, overrides: {} };
      }
      h.buttonVariants[activeIndex].linked = false;
      if (value === undefined) {
        delete h.buttonVariants[activeIndex].overrides[field];
      } else {
        h.buttonVariants[activeIndex].overrides[field] = value as never;
      }
    });
  }, [activeIndex, updateHud]);

  const resetHudButtonField = useCallback((field: keyof HudButtonControls) => {
    const defaultValue = DEFAULT_HUD_BUTTON_CONTROLS[field];
    setHudButtonField(field, defaultValue);
  }, [setHudButtonField]);

  const resetCurrentHudButton = useCallback(() => {
    updateHud((h) => {
      if (activeIndex < 0) {
        h.button = { ...DEFAULT_HUD_BUTTON_CONTROLS };
        return;
      }
      h.buttonVariants[activeIndex] = {
        linked: true,
        overrides: {},
      };
    });
  }, [activeIndex, updateHud]);

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
        <div style={{ padding: '0.75rem 1rem 0' }}>
          <ActionBar
            actions={[
              {
                label: activeSection === "layout"
                  ? "Copy Button Layout"
                  : activeSection === "geometry"
                    ? "Copy Button Geometry"
                    : activeSection === "effects"
                      ? "Copy Button Effects"
                      : "Copy Button Colours",
                onClick: () => copyJson(
                  activeSection === "layout"
                    ? {
                      target: activeIndex < 0 ? "master" : hud.buttonLabels?.[activeIndex] || HUD_BUTTON_SLOTS[activeIndex],
                      buttonScale: hud.buttonScale,
                      buttonCount: hud.buttonCount,
                      buttonBank: hud.buttonBank,
                      label: activeIndex >= 0 ? hud.buttonLabels?.[activeIndex] ?? "" : undefined,
                    }
                    : activeSection === "geometry"
                      ? {
                        target: activeIndex < 0 ? "master" : hud.buttonLabels?.[activeIndex] || HUD_BUTTON_SLOTS[activeIndex],
                        geometry: {
                          width: effective.width,
                          height: effective.height,
                          bodyHeight: effective.bodyHeight,
                          radius: effective.radius,
                          sideInset: effective.sideInset,
                          dotInset: effective.dotInset,
                          dotGap: effective.dotGap,
                          fontSize: effective.fontSize,
                          leftX: effective.leftX,
                          rightX: effective.rightX,
                        },
                      }
                      : activeSection === "effects"
                        ? {
                          target: activeIndex < 0 ? "master" : hud.buttonLabels?.[activeIndex] || HUD_BUTTON_SLOTS[activeIndex],
                          effects: {
                            buttonOffsetX: effective.buttonOffsetX,
                            buttonOffsetY: effective.buttonOffsetY,
                            hoverInsetExpand: effective.hoverInsetExpand,
                            hoverClampGlowOpacity: effective.hoverClampGlowOpacity,
                            clickInsetExpand: effective.clickInsetExpand,
                            clickRingFlashOpacity: effective.clickRingFlashOpacity,
                          },
                        }
                        : {
                          target: activeIndex < 0 ? "master" : hud.buttonLabels?.[activeIndex] || HUD_BUTTON_SLOTS[activeIndex],
                          colors: Object.fromEntries(HUD_BUTTON_COLOR_FIELDS.map((field) => [field.key, effective[field.key] as string])),
                        },
                ),
              },
              {
                label: activeIndex < 0 ? "Reset Master Button" : "Reset Selected Button",
                onClick: () => confirmBundleReset(activeIndex < 0 ? "master button" : "selected button", resetCurrentHudButton),
                tone: "danger",
              },
            ]}
          />
        </div>
        {activeSection === "layout" && (
          <Section title="Layout Configuration">
            <NumberField label="Bank Scale" value={hud.buttonScale ?? 1} min={0.25} max={2} step={0.01} onChange={(v) => updateHud(h => { h.buttonScale = v; })} onReset={() => updateHud(h => { h.buttonScale = DEFAULT_HUD_ARTWORK_CONTROLS.buttonScale; })} />
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
            <CheckboxField label="A/B Host + Slot Guides" value={resolvedEditorOverlayVisibility.hudBanks} onChange={(value) => updateEditorOverlayVisibility((next) => { next.hudBanks = value; })} />
            <CheckboxField label="Button Art Guides" value={resolvedEditorOverlayVisibility.hudButtons} onChange={(value) => updateEditorOverlayVisibility((next) => { next.hudButtons = value; })} />
            <NumberField label="Bank Gap" value={hud.buttonBank.gap} min={0} max={120} step={1} onChange={(v) => updateHud(h => { h.buttonBank.gap = v; })} onReset={() => updateHud(h => { h.buttonBank.gap = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.gap; })} />
            <NumberField label="Bank Pad X" value={hud.buttonBank.paddingX} min={0} max={120} step={1} onChange={(v) => updateHud(h => { h.buttonBank.paddingX = v; })} onReset={() => updateHud(h => { h.buttonBank.paddingX = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.paddingX; })} />
            <NumberField label="Bank Pad Y" value={hud.buttonBank.paddingY} min={0} max={120} step={1} onChange={(v) => updateHud(h => { h.buttonBank.paddingY = v; })} onReset={() => updateHud(h => { h.buttonBank.paddingY = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.paddingY; })} />
            <NumberField label="Bank Min Scale" value={hud.buttonBank.minScale} min={0.05} max={2} step={0.01} onChange={(v) => updateHud(h => { h.buttonBank.minScale = v; })} onReset={() => updateHud(h => { h.buttonBank.minScale = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.minScale; })} />
            <NumberField label="Bank Max Scale" value={hud.buttonBank.maxScale} min={0.05} max={3} step={0.01} onChange={(v) => updateHud(h => { h.buttonBank.maxScale = v; })} onReset={() => updateHud(h => { h.buttonBank.maxScale = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.maxScale; })} />
            <NumberField label="Left Bank X" value={hud.buttonBank.leftOffsetX} min={-320} max={320} step={1} onChange={(v) => updateHud(h => { h.buttonBank.leftOffsetX = v; })} onReset={() => updateHud(h => { h.buttonBank.leftOffsetX = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.leftOffsetX; })} />
            <NumberField label="Left Bank Y" value={hud.buttonBank.leftOffsetY} min={-180} max={180} step={1} onChange={(v) => updateHud(h => { h.buttonBank.leftOffsetY = v; })} onReset={() => updateHud(h => { h.buttonBank.leftOffsetY = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.leftOffsetY; })} />
            <NumberField label="Right Bank X" value={hud.buttonBank.rightOffsetX} min={-320} max={320} step={1} onChange={(v) => updateHud(h => { h.buttonBank.rightOffsetX = v; })} onReset={() => updateHud(h => { h.buttonBank.rightOffsetX = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.rightOffsetX; })} />
            <NumberField label="Right Bank Y" value={hud.buttonBank.rightOffsetY} min={-180} max={180} step={1} onChange={(v) => updateHud(h => { h.buttonBank.rightOffsetY = v; })} onReset={() => updateHud(h => { h.buttonBank.rightOffsetY = DEFAULT_HUD_ARTWORK_CONTROLS.buttonBank.rightOffsetY; })} />
          </Section>
        )}
        {activeSection === "geometry" && (
          <Section title="Body & Clamp Geometry">
            {HUD_BUTTON_GEOMETRY_FIELDS.map((field) => (
              <NumberField
                key={field.key}
                label={field.label}
                value={Number(effective[field.key] ?? DEFAULT_HUD_BUTTON_CONTROLS[field.key] ?? 0)}
                min={field.min}
                max={field.max}
                step={field.step}
                onReset={() => resetHudButtonField(field.key)}
                onChange={(v) => setHudButtonField(field.key, v)}
              />
            ))}
            <NumberField
              label="Left Clamp X"
              value={effectiveHudButtonGeometry.baseLeftX}
              min={-200}
              max={1800}
              step={1}
              onReset={() => setHudButtonField("leftX", undefined)}
              onChange={(v) => setHudButtonField("leftX", v)}
            />
            <NumberField
              label="Right Clamp X"
              value={effectiveHudButtonGeometry.baseRightX}
              min={-200}
              max={2200}
              step={1}
              onReset={() => setHudButtonField("rightX", undefined)}
              onChange={(v) => setHudButtonField("rightX", v)}
            />
          </Section>
        )}
        {activeSection === "effects" && (
          <Section title="Visual Effects">
            <NumberField
              label="Button Offset X"
              value={effective.buttonOffsetX}
              min={-240}
              max={240}
              step={1}
              onReset={() => resetHudButtonField("buttonOffsetX")}
              onChange={(v) => setHudButtonField("buttonOffsetX", v)}
            />
            <NumberField
              label="Button Offset Y"
              value={effective.buttonOffsetY}
              min={-240}
              max={240}
              step={1}
              onReset={() => resetHudButtonField("buttonOffsetY")}
              onChange={(v) => setHudButtonField("buttonOffsetY", v)}
            />
            <NumberField
              label="Hover Inset Expand"
              value={effective.hoverInsetExpand}
              min={0}
              max={48}
              step={1}
              onReset={() => resetHudButtonField("hoverInsetExpand")}
              onChange={(v) => setHudButtonField("hoverInsetExpand", v)}
            />
            <NumberField
              label="Hover Clamp Glow"
              value={effective.hoverClampGlowOpacity}
              min={0}
              max={1}
              step={0.01}
              onReset={() => resetHudButtonField("hoverClampGlowOpacity")}
              onChange={(v) => setHudButtonField("hoverClampGlowOpacity", v)}
            />
            <NumberField
              label="Click Inset Expand"
              value={effective.clickInsetExpand}
              min={0}
              max={48}
              step={1}
              onReset={() => resetHudButtonField("clickInsetExpand")}
              onChange={(v) => setHudButtonField("clickInsetExpand", v)}
            />
            <NumberField
              label="Click Ring Flash"
              value={effective.clickRingFlashOpacity}
              min={0}
              max={1}
              step={0.01}
              onReset={() => resetHudButtonField("clickRingFlashOpacity")}
              onChange={(v) => setHudButtonField("clickRingFlashOpacity", v)}
            />
          </Section>
        )}
        {activeSection === "colors" && (
          <Section title="Body, Side & Effect Colours">
            {HUD_BUTTON_COLOR_FIELDS.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                value={effective[field.key] as string}
                onReset={() => resetHudButtonField(field.key)}
                onChange={(v) => setHudButtonField(field.key, v)}
              />
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
      <ActionBar
        actions={[
          { label: "Copy Table Bundle", onClick: copyTableBundle },
          { label: "Reset Table Bundle", onClick: () => confirmBundleReset("table bundle", resetTableBundle), tone: "danger" },
        ]}
      />
      <div className="game-screen__hud-button-modal-tabs">
        {TABLE_SECTIONS.map(s => (
          <TabButton key={s.key} compact active={activeTableSection === s.key} onClick={() => setActiveTableSection(s.key)}>
            {s.label}
          </TabButton>
        ))}
      </div>
      <div className="game-screen__hud-button-modal-content">
        {activeTableSection === "placement" && (
          <>
            <Section title="Bounds">
              <ActionBar
                actions={[
                  {
                    label: "Copy Placement",
                    onClick: () => copyJson({
                      tablePresentation: document.tablePresentation,
                      stageBlock: stageLayout.arena,
                      renderToggles: {
                        table: document.renderToggles.table,
                        seats: document.renderToggles.seats,
                        playerUi: document.renderToggles.playerUi,
                        zones: document.renderToggles.zones,
                        deckTray: document.renderToggles.deckTray,
                      },
                    }),
                  },
                  {
                    label: "Reset Placement",
                    onClick: () => confirmBundleReset("table placement", () => updateDoc((draft) => {
                      draft.tablePresentation = { ...DEFAULT_TABLE_PRESENTATION };
                      draft.renderToggles.table = DEFAULT_RENDER_TOGGLES.table;
                      draft.renderToggles.seats = DEFAULT_RENDER_TOGGLES.seats;
                      draft.renderToggles.playerUi = DEFAULT_RENDER_TOGGLES.playerUi;
                      draft.renderToggles.zones = DEFAULT_RENDER_TOGGLES.zones;
                      draft.renderToggles.deckTray = DEFAULT_RENDER_TOGGLES.deckTray;
                      const nextStageLayout = ensureStageLayout(draft);
                      nextStageLayout.arena = { ...DEFAULT_STAGE_LAYOUT.arena };
                    })),
                    tone: "danger",
                  },
                ]}
              />
              <CheckboxField label="Table Root" value={resolvedEditorOverlayVisibility.table} onChange={(value) => updateEditorOverlayVisibility((next) => { next.table = value; })} />
              <CheckboxField label="Seat Anchors" value={resolvedEditorOverlayVisibility.seats} onChange={(value) => updateEditorOverlayVisibility((next) => { next.seats = value; })} />
              <CheckboxField label="Player UI Anchors" value={resolvedEditorOverlayVisibility.playerUi} onChange={(value) => updateEditorOverlayVisibility((next) => { next.playerUi = value; })} />
              <CheckboxField label="Zone Bounds" value={resolvedEditorOverlayVisibility.zones} onChange={(value) => updateEditorOverlayVisibility((next) => { next.zones = value; })} />
              <CheckboxField label="Deck + Tray Unit" value={resolvedEditorOverlayVisibility.deckTray} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTray = value; })} />
              <CheckboxField label="Deck Stack" value={resolvedEditorOverlayVisibility.deckTrayDeck} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTrayDeck = value; })} />
            </Section>
            <Section title="Placement & Scale">
              <CheckboxField label="Show Table" value={renderToggles.table} onChange={(value) => updateRenderToggles((next) => { next.table = value; })} />
              <CheckboxField label="Show Seats" value={renderToggles.seats} onChange={(value) => updateRenderToggles((next) => { next.seats = value; })} />
              <CheckboxField label="Show Player UI" value={renderToggles.playerUi} onChange={(value) => updateRenderToggles((next) => { next.playerUi = value; })} />
              <CheckboxField label="Show Zones" value={renderToggles.zones} onChange={(value) => updateRenderToggles((next) => { next.zones = value; })} />
              <NumberField label="Overall Scale" value={tablePresentation.overallScale} min={0.2} max={2.5} step={0.01} onChange={(value) => updateTablePresentation((next) => { next.overallScale = value; })} />
              <NumberField label="Arena Width" value={stageLayout.arena.contentWidth} min={400} max={2000} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.contentWidth = value; })} onReset={() => updateStageLayout((stage) => { stage.arena.contentWidth = DEFAULT_STAGE_LAYOUT.arena.contentWidth; })} />
              <NumberField label="Arena Height" value={stageLayout.arena.contentHeight} min={400} max={2000} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.contentHeight = value; })} onReset={() => updateStageLayout((stage) => { stage.arena.contentHeight = DEFAULT_STAGE_LAYOUT.arena.contentHeight; })} />
              <SelectField label="Fit Mode" value={stageLayout.arena.fitMode} options={STAGE_FIT_OPTIONS} onChange={(value) => updateStageLayout((stage) => { stage.arena.fitMode = value as CardGameStageFitMode; })} />
              <SelectField label="Anchor X" value={stageLayout.arena.anchorX} options={STAGE_ANCHOR_X_OPTIONS} onChange={(value) => updateStageLayout((stage) => { stage.arena.anchorX = value as "start" | "center" | "end"; })} />
              <SelectField label="Anchor Y" value={stageLayout.arena.anchorY} options={STAGE_ANCHOR_Y_OPTIONS} onChange={(value) => updateStageLayout((stage) => { stage.arena.anchorY = value as "start" | "center" | "end"; })} />
              <NumberField label="Offset X" value={stageLayout.arena.offsetX} min={-400} max={400} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.offsetX = value; })} onReset={() => updateStageLayout((stage) => { stage.arena.offsetX = DEFAULT_STAGE_LAYOUT.arena.offsetX; })} />
              <NumberField label="Offset Y" value={stageLayout.arena.offsetY} min={-400} max={400} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.offsetY = value; })} onReset={() => updateStageLayout((stage) => { stage.arena.offsetY = DEFAULT_STAGE_LAYOUT.arena.offsetY; })} />
              <NumberField label="Inset Top" value={stageLayout.arena.insetTop} min={0} max={320} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.insetTop = value; })} />
              <NumberField label="Inset Right" value={stageLayout.arena.insetRight} min={0} max={320} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.insetRight = value; })} />
              <NumberField label="Inset Bottom" value={stageLayout.arena.insetBottom} min={0} max={320} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.insetBottom = value; })} />
              <NumberField label="Inset Left" value={stageLayout.arena.insetLeft} min={0} max={320} step={1} onChange={(value) => updateStageLayout((stage) => { stage.arena.insetLeft = value; })} />
              <NumberField label="Min Scale" value={stageLayout.arena.minScale} min={0.1} max={2} step={0.01} onChange={(value) => updateStageLayout((stage) => { stage.arena.minScale = value; })} />
              <NumberField label="Max Scale" value={stageLayout.arena.maxScale} min={0.1} max={2} step={0.01} onChange={(value) => updateStageLayout((stage) => { stage.arena.maxScale = value; })} />
            </Section>
          </>
        )}

        {activeTableSection === "shape" && (
          <Section title="Table Geometry">
            <ActionBar
              actions={[
                { label: "Copy Shape", onClick: () => copyJson({ table: activePreset.table }) },
                {
                  label: "Reset Shape",
                  onClick: () => confirmBundleReset("table shape", () => updateDoc((draft) => {
                    ensurePreset(draft).table = { ...DEFAULT_TABLE_SHAPE };
                  })),
                  tone: "danger",
                },
              ]}
            />
            <NumberField label="Width" value={activePreset.table.width ?? DEFAULT_TABLE_SHAPE.width ?? 960} min={400} max={1800} step={1} onChange={(v) => updateDoc(d => { ensurePreset(d).table.width = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.width = DEFAULT_TABLE_SHAPE.width; })} />
            <NumberField label="Height" value={activePreset.table.height ?? DEFAULT_TABLE_SHAPE.height ?? 560} min={200} max={1000} step={1} onChange={(v) => updateDoc(d => { ensurePreset(d).table.height = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.height = DEFAULT_TABLE_SHAPE.height; })} />
            <NumberField label="Offset X" value={activePreset.table.offsetX ?? DEFAULT_TABLE_SHAPE.offsetX ?? 0} min={-400} max={400} step={1} onChange={(v) => updateDoc(d => { ensurePreset(d).table.offsetX = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.offsetX = DEFAULT_TABLE_SHAPE.offsetX; })} />
            <NumberField label="Offset Y" value={activePreset.table.offsetY ?? DEFAULT_TABLE_SHAPE.offsetY ?? -78} min={-400} max={400} step={1} onChange={(v) => updateDoc(d => { ensurePreset(d).table.offsetY = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.offsetY = DEFAULT_TABLE_SHAPE.offsetY; })} />
            <NumberField label="Curvature" value={activePreset.table.curvature ?? DEFAULT_TABLE_SHAPE.curvature ?? 0.88} min={0} max={1} step={0.01} onChange={(v) => updateDoc(d => { ensurePreset(d).table.curvature = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.curvature = DEFAULT_TABLE_SHAPE.curvature; })} />
            <ColorField label="Rim Color" value={activePreset.table.rimColor ?? DEFAULT_TABLE_SHAPE.rimColor ?? "rgb(244, 197, 66)"} onChange={(v) => updateDoc(d => { ensurePreset(d).table.rimColor = v; })} onReset={() => updateDoc(d => { ensurePreset(d).table.rimColor = DEFAULT_TABLE_SHAPE.rimColor; })} />
          </Section>
        )}

        {activeTableSection === "seats" && (
          <>
            <Section title={`Seats — ${resolvedPlayerCount} players`}>
              <ActionBar
                actions={[
                  { label: "Copy Seats", onClick: () => copyJson({ seats: activePreset.seats, renderToggles: { seats: document.renderToggles.seats } }) },
                  { label: "Reset Seat Ring", onClick: () => confirmBundleReset("seat ring", handleResetSeatRing), tone: "danger" },
                ]}
              />
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
                    onClick={() => handleSeatSelection(seat.id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: selectedSeat?.id === seat.id ? '#4ade80' : 'rgba(141,255,176,0.2)',
                      background: selectedSeat?.id === seat.id ? 'rgba(74,222,128,0.18)' : 'transparent',
                      color: selectedSeat?.id === seat.id ? '#eaffed' : 'rgba(220,255,230,0.65)',
                      fontSize: '0.72rem',
                      fontWeight: selectedSeat?.id === seat.id ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {seat.label || `Seat ${seat.id + 1}`}
                  </button>
                ))}
              </div>
              {selectedSeat ? (
                <>
                  <TextField
                    label="Seat Label"
                    value={selectedSeat.label ?? `Seat ${selectedSeat.id + 1}`}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.label = v; })}
                  />
                  <NumberField
                    label="Position X"
                    value={selectedSeat.position.x}
                    min={-0.5} max={1.5} step={0.001}
                    onChange={(v) => updateSeat(selectedSeat.id, s => { s.position.x = Math.round(v * 10000) / 10000; })}
                  />
                  <NumberField
                    label="Position Y"
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
              <ActionBar
                actions={[
                  {
                    label: "Copy Player UI",
                    onClick: () => copyJson({
                      playerUiDefaults: document.playerUiDefaults,
                      seats: activePreset.seats,
                      renderToggles: {
                        playerUi: document.renderToggles.playerUi,
                        seats: document.renderToggles.seats,
                      },
                    }),
                  },
                  {
                    label: "Reset Player UI",
                    onClick: () => confirmBundleReset("player UI", () => updateDoc((draft) => {
                      draft.playerUiDefaults = { ...DEFAULT_PLAYER_UI_DEFAULTS };
                      const preset = ensurePreset(draft);
                      preset.seats = preset.seats.map((seat) => ({
                        ...seat,
                        position: { ...seat.position },
                        playerOverrides: undefined,
                      })) as SeatLayout[];
                      draft.renderToggles.playerUi = DEFAULT_RENDER_TOGGLES.playerUi;
                    })),
                    tone: "danger",
                  },
                ]}
              />
              <NumberField label="Overall Scale" value={document.playerUiDefaults.overallScale ?? DEFAULT_PLAYER_UI_DEFAULTS.overallScale} min={0.2} max={2} step={0.01} onChange={(v) => updateDoc(d => { d.playerUiDefaults.overallScale = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.overallScale = DEFAULT_PLAYER_UI_DEFAULTS.overallScale; })} />
              <NumberField label="Base Arc Rotation" value={document.playerUiDefaults.baseArcRotation ?? DEFAULT_PLAYER_UI_DEFAULTS.baseArcRotation} min={-180} max={180} step={1} onChange={(v) => updateDoc(d => { d.playerUiDefaults.baseArcRotation = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.baseArcRotation = DEFAULT_PLAYER_UI_DEFAULTS.baseArcRotation; })} />
              <NumberField label="Info Box Angle" value={document.playerUiDefaults.infoBoxAngle ?? DEFAULT_PLAYER_UI_DEFAULTS.infoBoxAngle} min={0} max={360} step={1} onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxAngle = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxAngle = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxAngle; })} />
              <NumberField label="Info Box Rotation" value={document.playerUiDefaults.infoBoxRotation ?? DEFAULT_PLAYER_UI_DEFAULTS.infoBoxRotation} min={-180} max={180} step={1} onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxRotation = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxRotation = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxRotation; })} />
              <NumberField label="Label Offset" value={document.playerUiDefaults.labelTextOffset ?? DEFAULT_PLAYER_UI_DEFAULTS.labelTextOffset} min={-120} max={120} step={1} onChange={(v) => updateDoc(d => { d.playerUiDefaults.labelTextOffset = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.labelTextOffset = DEFAULT_PLAYER_UI_DEFAULTS.labelTextOffset; })} />
              <NumberField label="Avatar Scale" value={document.playerUiDefaults.avatarImageScale ?? DEFAULT_PLAYER_UI_DEFAULTS.avatarImageScale} min={0.2} max={2} step={0.01} onChange={(v) => updateDoc(d => { d.playerUiDefaults.avatarImageScale = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.avatarImageScale = DEFAULT_PLAYER_UI_DEFAULTS.avatarImageScale; })} />
              <ColorField label="Avatar Base" value={document.playerUiDefaults.avatarBaseColor ?? DEFAULT_PLAYER_UI_DEFAULTS.avatarBaseColor} onChange={(v) => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.avatarBaseColor = DEFAULT_PLAYER_UI_DEFAULTS.avatarBaseColor; })} />
              <ColorField label="Info Box" value={document.playerUiDefaults.infoBoxColor ?? DEFAULT_PLAYER_UI_DEFAULTS.infoBoxColor} onChange={(v) => updateDoc(d => { d.playerUiDefaults.infoBoxColor = v; })} onReset={() => updateDoc(d => { d.playerUiDefaults.infoBoxColor = DEFAULT_PLAYER_UI_DEFAULTS.infoBoxColor; })} />
            </Section>

            <Section title={`Per-Seat Overrides - ${resolvedPlayerCount} players`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {activePreset.seats.map(seat => (
                  <button
                    key={seat.id}
                    type="button"
                    onClick={() => handleSeatSelection(seat.id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: seat.id === selectedSeatId
                        ? '#4ade80'
                        : seat.playerOverrides && Object.keys(seat.playerOverrides).length > 0
                          ? 'rgba(255, 196, 91, 0.55)'
                          : 'rgba(141,255,176,0.2)',
                      background: seat.id === selectedSeatId
                        ? 'rgba(74,222,128,0.18)'
                        : seat.playerOverrides && Object.keys(seat.playerOverrides).length > 0
                          ? 'rgba(255, 196, 91, 0.12)'
                          : 'rgba(141,255,176,0.04)',
                      color: seat.id === selectedSeatId ? '#eaffed' : 'rgba(220,255,230,0.65)',
                      fontSize: '0.72rem',
                      fontWeight: seat.id === selectedSeatId ? 700 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {seat.label || `Seat ${seat.id + 1}`}{seat.playerOverrides && Object.keys(seat.playerOverrides).length > 0 ? ' *' : ''}
                  </button>
                ))}
              </div>
              {selectedSeat ? (
                <>
                  <NumberField
                    label="Arc Rotation Override"
                    value={selectedSeat.playerOverrides?.baseArcRotation ?? document.playerUiDefaults.baseArcRotation ?? DEFAULT_PLAYER_UI_DEFAULTS.baseArcRotation}
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
                    value={selectedSeat.playerOverrides?.infoBoxAngle ?? document.playerUiDefaults.infoBoxAngle ?? DEFAULT_PLAYER_UI_DEFAULTS.infoBoxAngle}
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
                    value={selectedSeat.playerOverrides?.infoBoxRotation ?? document.playerUiDefaults.infoBoxRotation ?? DEFAULT_PLAYER_UI_DEFAULTS.infoBoxRotation}
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

        {activeTableSection === "attachments" && (
          <>
            <Section title="Deck + Tray Attachment">
              <ActionBar
                actions={[
                  { label: "Copy Deck + Tray Prefab", onClick: copyDeckTrayBundle },
                  { label: "Reset Deck + Tray Prefab", onClick: () => confirmBundleReset("deck and tray prefab", resetDeckTrayBundle), tone: "danger" },
                ]}
              />
              <CheckboxField label="Show Deck Tray" value={renderToggles.deckTray} onChange={(value) => updateRenderToggles((next) => { next.deckTray = value; })} />
              <CheckboxField label="Tray Unit Bounds" value={resolvedEditorOverlayVisibility.deckTray} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTray = value; })} />
              <CheckboxField label="Deck Stack Bounds" value={resolvedEditorOverlayVisibility.deckTrayDeck} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTrayDeck = value; })} />
              <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                Tray Unit Bounds shows the whole attachment box on the table. Deck Stack Bounds shows the cards sitting inside that tray.
              </div>
              <NumberField label="Position X" value={deckTrayAttachment.position.x} min={-0.5} max={1.5} step={0.01} onChange={(value) => updateDeckTrayAttachment((next) => { next.position.x = value; })} />
              <NumberField label="Position Y" value={deckTrayAttachment.position.y} min={-0.5} max={1.5} step={0.01} onChange={(value) => updateDeckTrayAttachment((next) => { next.position.y = value; })} />
              <NumberField label="Width" value={deckTrayAttachment.size.width} min={0.05} max={1} step={0.01} onChange={(value) => updateDeckTrayAttachment((next) => { next.size.width = value; })} />
              <NumberField label="Height" value={deckTrayAttachment.size.height} min={0.05} max={1} step={0.01} onChange={(value) => updateDeckTrayAttachment((next) => { next.size.height = value; })} />
              <NumberField label="Scale" value={deckTrayAttachment.scale} min={0.1} max={3} step={0.01} onChange={(value) => updateDeckTrayAttachment((next) => { next.scale = value; })} />
              <NumberField label="Rotation" value={deckTrayAttachment.rotation} min={-180} max={180} step={1} onChange={(value) => updateDeckTrayAttachment((next) => { next.rotation = value; })} />
            </Section>
          </>
        )}

        {activeTableSection === "zones" && (
          <Section title="Arena Zones">
            <ActionBar
              actions={[
                {
                  label: "Copy Zones",
                  onClick: () => copyJson({
                    zones: document.zones,
                    renderToggles: {
                      zones: document.renderToggles.zones,
                    },
                  }),
                },
                {
                  label: "Reset Zones",
                  onClick: () => confirmBundleReset("zones", () => updateDoc((draft) => {
                    draft.zones = cloneZones(DEFAULT_ZONES);
                    draft.renderToggles.zones = DEFAULT_RENDER_TOGGLES.zones;
                  })),
                  tone: "danger",
                },
              ]}
            />
            <div className="game-screen__hud-button-label-grid">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={`game-screen__hud-button-modal-tab ${selectedZone?.id === zone.id ? "game-screen__hud-button-modal-tab--active" : ""}`}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  {zone.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                className="game-screen__hud-button-modal-tab"
                onClick={() => updateDoc((draft) => {
                  const nextZones = [...(draft.zones ?? [])];
                  const index = nextZones.length + 1;
                  nextZones.push({
                    id: `zone-${index}`,
                    label: `Zone ${index}`,
                    type: "card",
                    position: { x: 0.5, y: 0.5 },
                    size: { width: 0.18, height: 0.14 },
                    scale: 1,
                    rotation: 0,
                    emptyText: "Empty",
                  });
                  draft.zones = nextZones;
                })}
              >
                Add Zone
              </button>
              {selectedZone ? (
                <button
                  type="button"
                  className="game-screen__hud-button-modal-tab"
                  onClick={() => {
                    const zoneId = selectedZone.id;
                    updateDoc((draft) => {
                      draft.zones = (draft.zones ?? []).filter((zone) => zone.id !== zoneId);
                    });
                    setSelectedZoneId(null);
                  }}
                >
                  Remove Selected
                </button>
              ) : null}
            </div>
            {selectedZone ? (
              <>
                <TextField label="Zone ID" value={selectedZone.id} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.id = value; })} />
                <TextField label="Label" value={selectedZone.label} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.label = value; })} />
                <SelectField label="Type" value={selectedZone.type} options={ZONE_TYPE_OPTIONS} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.type = value as TableZoneType; })} />
                <TextField label="Engine Binding" value={selectedZone.engineBinding ?? ""} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.engineBinding = value; })} />
                <TextField label="Empty Text" value={selectedZone.emptyText ?? ""} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.emptyText = value; })} />
                <NumberField label="Pos X" value={selectedZone.position.x} min={-0.5} max={1.5} step={0.01} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.position.x = value; })} />
                <NumberField label="Pos Y" value={selectedZone.position.y} min={-0.5} max={1.5} step={0.01} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.position.y = value; })} />
                <NumberField label="Width" value={selectedZone.size?.width ?? 0.18} min={0.02} max={1} step={0.01} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.size = { width: value, height: zone.size?.height ?? 0.14 }; })} />
                <NumberField label="Height" value={selectedZone.size?.height ?? 0.14} min={0.02} max={1} step={0.01} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.size = { width: zone.size?.width ?? 0.18, height: value }; })} />
                <NumberField label="Scale" value={selectedZone.scale ?? 1} min={0.1} max={3} step={0.01} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.scale = value; })} />
                <NumberField label="Rotation" value={selectedZone.rotation ?? 0} min={-180} max={180} step={1} onChange={(value) => updateZone(selectedZone.id, (zone) => { zone.rotation = value; })} />
              </>
            ) : (
              <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.78rem' }}>
                Add or select a zone to edit its layout and engine binding.
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`game-screen__hud-button-modal ${embedded ? "design-studio--embedded" : ""}`}
      style={embedded ? {
        position: 'relative',
        inset: 'auto',
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
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
        {workspaceSection === "layerSplit" && (
          <div className="game-screen__hud-button-modal-content">
            <Section title="Temporary Isolation">
              <ActionBar
                actions={[
                  { label: "Show All", onClick: () => setAllEditorIsolationLayers(true) },
                  { label: "Hide All", onClick: () => setAllEditorIsolationLayers(false) },
                  { label: "Reset Isolation", onClick: resetEditorIsolationLayers, tone: "danger" },
                ]}
              />
              <div style={{ color: 'rgba(220,255,230,0.52)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                These toggles only mute editor rendering for inspection. They do not change saved layout, placement, or runtime enablement.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {EDITOR_ISOLATION_TREE.map((node) => (
                  <IsolationTreeNodeRow
                    key={node.key ?? node.label}
                    node={node}
                    visibility={resolvedEditorLayerVisibility}
                    onToggle={toggleEditorIsolationLayer}
                  />
                ))}
              </div>
            </Section>
          </div>
        )}
        {workspaceSection === "shell" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy Shell Bundle", onClick: copyShellBundle },
                { label: "Reset Shell Bundle", onClick: () => confirmBundleReset("shell bundle", resetShellBundle), tone: "danger" },
                { label: "Copy Layout", onClick: copyLayoutBundle },
              ]}
            />
            <Section title="Runtime Enablement">
              <CheckboxField label="Show Background" value={renderToggles.background} onChange={(value) => updateRenderToggles((next) => { next.background = value; })} />
              <CheckboxField label="Show Header" value={renderToggles.header} onChange={(value) => updateRenderToggles((next) => { next.header = value; })} />
              <CheckboxField label="Show Footer" value={renderToggles.footer} onChange={(value) => updateRenderToggles((next) => { next.footer = value; })} />
            </Section>
            <Section title="Bounds">
              <CheckboxField label="Header Shell" value={resolvedEditorOverlayVisibility.header} onChange={(value) => updateEditorOverlayVisibility((next) => { next.header = value; })} />
              <CheckboxField label="Footer Shell" value={resolvedEditorOverlayVisibility.footer} onChange={(value) => updateEditorOverlayVisibility((next) => { next.footer = value; })} />
            </Section>
            <Section title="Stage Viewport">
              <NumberField
                label="Viewport Width"
                value={stageLayout.authoredViewport.width}
                min={800}
                max={3840}
                step={1}
                onChange={(v) => updateStageLayout((stage) => { stage.authoredViewport.width = v; })}
                onReset={() => updateStageLayout((stage) => { stage.authoredViewport.width = DEFAULT_STAGE_LAYOUT.authoredViewport.width; })}
              />
              <NumberField
                label="Viewport Height"
                value={stageLayout.authoredViewport.height}
                min={600}
                max={2160}
                step={1}
                onChange={(v) => updateStageLayout((stage) => { stage.authoredViewport.height = v; })}
                onReset={() => updateStageLayout((stage) => { stage.authoredViewport.height = DEFAULT_STAGE_LAYOUT.authoredViewport.height; })}
              />
            </Section>
          </div>
        )}
        {workspaceSection === "hudTuning" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy HUD Bundle", onClick: copyHudBundle },
                { label: "Reset HUD Bundle", onClick: () => confirmBundleReset("HUD bundle", resetHudBundle), tone: "danger" },
              ]}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(141,255,176,0.1)' }}>
              {HUD_TUNING_SECTIONS.map((tab) => {
                return (
                  <TabButton
                    key={tab.key}
                    compact
                    active={hudTuningSection === tab.key}
                    onClick={() => setHudTuningSection(tab.key)}
                  >
                    {tab.label}
                  </TabButton>
                );
              })}
            </div>

            {hudTuningSection === "base" && (
              <>
                <Section title="Placement & Scale">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Base",
                        onClick: () => copyJson({
                          hud: {
                            width: hud.width,
                            height: hud.height,
                            hudOffsetX: hud.hudOffsetX,
                            hudOffsetY: hud.hudOffsetY,
                            overallScale: hud.overallScale,
                          },
                          stageBlock: stageLayout.hud,
                          renderToggles: {
                            hud: document.renderToggles.hud,
                            cardFan: document.renderToggles.cardFan,
                          },
                        }),
                      },
                      {
                        label: "Reset Base",
                        onClick: () => confirmBundleReset("HUD base", () => updateDoc((draft) => {
                          draft.hud.width = DEFAULT_HUD_ARTWORK_CONTROLS.width;
                          draft.hud.height = DEFAULT_HUD_ARTWORK_CONTROLS.height;
                          draft.hud.hudOffsetX = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetX;
                          draft.hud.hudOffsetY = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetY;
                          draft.hud.overallScale = DEFAULT_HUD_ARTWORK_CONTROLS.overallScale;
                          draft.renderToggles.hud = DEFAULT_RENDER_TOGGLES.hud;
                          draft.renderToggles.cardFan = DEFAULT_RENDER_TOGGLES.cardFan;
                          const nextStageLayout = ensureStageLayout(draft);
                          nextStageLayout.hud = { ...DEFAULT_STAGE_LAYOUT.hud };
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <CheckboxField label="Show HUD" value={renderToggles.hud} onChange={(value) => updateRenderToggles((next) => { next.hud = value; })} />
                  <CheckboxField label="Show Cards In Hand" value={renderToggles.cardFan} onChange={(value) => updateRenderToggles((next) => { next.cardFan = value; })} />
                  <SelectField
                    label="Fit Mode"
                    value={stageLayout.hud.fitMode}
                    options={STAGE_FIT_OPTIONS}
                    onChange={(value) => updateStageLayout((stage) => { stage.hud.fitMode = value as CardGameStageFitMode; })}
                  />
                  <SelectField
                    label="Anchor X"
                    value={stageLayout.hud.anchorX}
                    options={STAGE_ANCHOR_X_OPTIONS}
                    onChange={(value) => updateStageLayout((stage) => { stage.hud.anchorX = value as "start" | "center" | "end"; })}
                  />
                  <SelectField
                    label="Anchor Y"
                    value={stageLayout.hud.anchorY}
                    options={STAGE_ANCHOR_Y_OPTIONS}
                    onChange={(value) => updateStageLayout((stage) => { stage.hud.anchorY = value as "start" | "center" | "end"; })}
                  />
                  <NumberField label="Offset X" value={stageLayout.hud.offsetX} min={-400} max={400} step={1} onChange={(v) => updateStageLayout((stage) => { stage.hud.offsetX = v; })} onReset={() => updateStageLayout((stage) => { stage.hud.offsetX = DEFAULT_STAGE_LAYOUT.hud.offsetX; })} />
                  <NumberField label="Offset Y" value={stageLayout.hud.offsetY} min={-400} max={400} step={1} onChange={(v) => updateStageLayout((stage) => { stage.hud.offsetY = v; })} onReset={() => updateStageLayout((stage) => { stage.hud.offsetY = DEFAULT_STAGE_LAYOUT.hud.offsetY; })} />
                  <NumberField label="Inset Left" value={stageLayout.hud.insetLeft} min={0} max={320} step={1} onChange={(v) => updateStageLayout((stage) => { stage.hud.insetLeft = v; })} />
                  <NumberField label="Inset Right" value={stageLayout.hud.insetRight} min={0} max={320} step={1} onChange={(v) => updateStageLayout((stage) => { stage.hud.insetRight = v; })} />
                  <NumberField label="Inset Bottom" value={stageLayout.hud.insetBottom} min={0} max={320} step={1} onChange={(v) => updateStageLayout((stage) => { stage.hud.insetBottom = v; })} />
                  <NumberField label="Min Scale" value={stageLayout.hud.minScale} min={0.1} max={2} step={0.01} onChange={(v) => updateStageLayout((stage) => { stage.hud.minScale = v; })} />
                  <NumberField label="Max Scale" value={stageLayout.hud.maxScale} min={0.1} max={2} step={0.01} onChange={(v) => updateStageLayout((stage) => { stage.hud.maxScale = v; })} />
                </Section>
                <Section title="Bounds">
                  <CheckboxField label="HUD Root" value={resolvedEditorOverlayVisibility.hud} onChange={(value) => updateEditorOverlayVisibility((next) => { next.hud = value; })} />
                  <CheckboxField label="Dome" value={resolvedEditorOverlayVisibility.hudDome} onChange={(value) => updateEditorOverlayVisibility((next) => { next.hudDome = value; })} />
                  <CheckboxField label="Wings" value={resolvedEditorOverlayVisibility.hudWings} onChange={(value) => updateEditorOverlayVisibility((next) => { next.hudWings = value; })} />
                  <CheckboxField label="Cards In Hand" value={resolvedEditorOverlayVisibility.cardFan} onChange={(value) => updateEditorOverlayVisibility((next) => { next.cardFan = value; })} />
                </Section>
                <Section title="HUD Base Art Styling">
                <NumberField label="HUD Width" value={hud.width} min={400} max={2500} step={1} onChange={(v) => updateHud(h => {
                  const diff = v - h.width;
                  h.width = v;
                  h.dome.cx += diff / 2;
                  h.leftWing.width += diff / 2;
                  h.rightWing.x += diff / 2;
                  h.rightWing.width += diff / 2;
                })} onReset={() => updateHud(h => {
                  const diff = DEFAULT_HUD_ARTWORK_CONTROLS.width - h.width;
                  h.width = DEFAULT_HUD_ARTWORK_CONTROLS.width;
                  h.dome.cx += diff / 2;
                  h.leftWing.width += diff / 2;
                  h.rightWing.x += diff / 2;
                  h.rightWing.width += diff / 2;
                })} />
                <NumberField label="HUD Height" value={hud.height} min={100} max={600} step={1} onChange={(v) => updateHud(h => { h.height = v; })} onReset={() => updateHud(h => { h.height = DEFAULT_HUD_ARTWORK_CONTROLS.height; })} />
                <NumberField label="Offset X" value={hud.hudOffsetX} min={-400} max={400} step={1} onChange={(v) => updateHud(h => { h.hudOffsetX = v; })} onReset={() => updateHud(h => { h.hudOffsetX = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetX; })} />
                <NumberField label="Offset Y" value={hud.hudOffsetY} min={-400} max={400} step={1} onChange={(v) => updateHud(h => { h.hudOffsetY = v; })} onReset={() => updateHud(h => { h.hudOffsetY = DEFAULT_HUD_ARTWORK_CONTROLS.hudOffsetY; })} />
                <NumberField label="Overall Scale" value={hud.overallScale} min={0.2} max={2.0} step={0.01} onChange={(v) => updateHud(h => { h.overallScale = v; })} onReset={() => updateHud(h => { h.overallScale = DEFAULT_HUD_ARTWORK_CONTROLS.overallScale; })} />
              </Section>
            </>
            )}

            {hudTuningSection === "wings" && (
              <Section title="HUD Wing Geometry">
                <ActionBar
                  actions={[
                    { label: "Copy Wings", onClick: () => copyJson({ linkedWings: hud.linkedWings, leftWing: hud.leftWing, rightWing: hud.rightWing }) },
                    {
                      label: "Reset Wings",
                      onClick: () => confirmBundleReset("HUD wings", () => updateHud((next) => {
                        next.linkedWings = DEFAULT_HUD_ARTWORK_CONTROLS.linkedWings;
                        next.leftWing = { ...DEFAULT_HUD_ARTWORK_CONTROLS.leftWing };
                        next.rightWing = { ...DEFAULT_HUD_ARTWORK_CONTROLS.rightWing };
                      })),
                      tone: "danger",
                    },
                  ]}
                />
                <CheckboxField
                  label="Link Left & Right Wings"
                  value={hud.linkedWings === true}
                  onChange={(v) => updateHud(h => {
                    h.linkedWings = v;
                    if (v) {
                      h.rightWing.width = h.leftWing.width;
                      h.rightWing.height = h.leftWing.height;
                      h.rightWing.y = h.leftWing.y;
                      h.rightWing.topRadius = h.leftWing.topRadius;
                      h.rightWing.x = h.width / 2 - 1;
                    }
                  })}
                />
                {hud.linkedWings ? (
                  <>
                    <NumberField label="Wing Width" value={hud.leftWing.width} min={10} max={1500} step={1}
                      onChange={(v) => updateHud(h => {
                        h.leftWing.width = v;
                        h.rightWing.width = v;
                        h.rightWing.x = h.width / 2 - 1;
                      })}
                      onReset={() => updateHud(h => {
                        h.leftWing.width = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.width;
                        h.rightWing.width = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.width;
                        h.rightWing.x = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.x;
                      })}
                    />
                    <NumberField label="Wing Height" value={hud.leftWing.height} min={10} max={400} step={1}
                      onChange={(v) => updateHud(h => {
                        h.leftWing.height = v;
                        h.rightWing.height = v;
                      })}
                      onReset={() => updateHud(h => {
                        h.leftWing.height = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.height;
                        h.rightWing.height = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.height;
                      })}
                    />
                    <NumberField label="Wing Y Position" value={hud.leftWing.y} min={0} max={400} step={1}
                      onChange={(v) => updateHud(h => {
                        h.leftWing.y = v;
                        h.rightWing.y = v;
                      })}
                      onReset={() => updateHud(h => {
                        h.leftWing.y = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.y;
                        h.rightWing.y = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.y;
                      })}
                    />
                    <NumberField label="Top Radius" value={hud.leftWing.topRadius} min={0} max={100} step={1}
                      onChange={(v) => updateHud(h => {
                        h.leftWing.topRadius = v;
                        h.rightWing.topRadius = v;
                      })}
                      onReset={() => updateHud(h => {
                        h.leftWing.topRadius = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.topRadius;
                        h.rightWing.topRadius = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.topRadius;
                      })}
                    />
                  </>
                ) : (
                  <div style={{ gridColumn: '1 / -1', width: '100%', display: 'flex', flexDirection: 'row', gap: '0.75rem' }}>
                    <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', minWidth: 0 }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.05em' }}>LEFT WING</div>
                      <NumberField label="Width" value={hud.leftWing.width} min={10} max={1500} step={1} onChange={(v) => updateHud(h => { h.leftWing.width = v; })} onReset={() => updateHud(h => { h.leftWing.width = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.width; })} />
                      <NumberField label="Height" value={hud.leftWing.height} min={10} max={400} step={1} onChange={(v) => updateHud(h => { h.leftWing.height = v; })} onReset={() => updateHud(h => { h.leftWing.height = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.height; })} />
                      <NumberField label="X Pos" value={hud.leftWing.x} min={-400} max={2500} step={1} onChange={(v) => updateHud(h => { h.leftWing.x = v; })} onReset={() => updateHud(h => { h.leftWing.x = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.x; })} />
                      <NumberField label="Y Pos" value={hud.leftWing.y} min={0} max={400} step={1} onChange={(v) => updateHud(h => { h.leftWing.y = v; })} onReset={() => updateHud(h => { h.leftWing.y = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.y; })} />
                      <NumberField label="Radius" value={hud.leftWing.topRadius} min={0} max={100} step={1} onChange={(v) => updateHud(h => { h.leftWing.topRadius = v; })} onReset={() => updateHud(h => { h.leftWing.topRadius = DEFAULT_HUD_ARTWORK_CONTROLS.leftWing.topRadius; })} />
                    </div>

                    <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', minWidth: 0 }}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 'bold', letterSpacing: '0.05em' }}>RIGHT WING</div>
                      <NumberField label="Width" value={hud.rightWing.width} min={10} max={1500} step={1} onChange={(v) => updateHud(h => { h.rightWing.width = v; })} onReset={() => updateHud(h => { h.rightWing.width = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.width; })} />
                      <NumberField label="Height" value={hud.rightWing.height} min={10} max={400} step={1} onChange={(v) => updateHud(h => { h.rightWing.height = v; })} onReset={() => updateHud(h => { h.rightWing.height = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.height; })} />
                      <NumberField label="X Pos" value={hud.rightWing.x} min={-400} max={2500} step={1} onChange={(v) => updateHud(h => { h.rightWing.x = v; })} onReset={() => updateHud(h => { h.rightWing.x = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.x; })} />
                      <NumberField label="Y Pos" value={hud.rightWing.y} min={0} max={400} step={1} onChange={(v) => updateHud(h => { h.rightWing.y = v; })} onReset={() => updateHud(h => { h.rightWing.y = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.y; })} />
                      <NumberField label="Radius" value={hud.rightWing.topRadius} min={0} max={100} step={1} onChange={(v) => updateHud(h => { h.rightWing.topRadius = v; })} onReset={() => updateHud(h => { h.rightWing.topRadius = DEFAULT_HUD_ARTWORK_CONTROLS.rightWing.topRadius; })} />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {hudTuningSection === "dome" && (
              <Section title="Center Dome Geometry (Center-Pivot)">
                <ActionBar
                  actions={[
                    { label: "Copy Dome", onClick: () => copyJson({ dome: hud.dome }) },
                    {
                      label: "Reset Dome",
                      onClick: () => confirmBundleReset("HUD dome", () => updateHud((next) => {
                        next.dome = { ...DEFAULT_HUD_ARTWORK_CONTROLS.dome };
                      })),
                      tone: "danger",
                    },
                  ]}
                />
                <NumberField label="Dome Width" value={hud.dome.width} min={10} max={1500} step={1} onChange={(v) => updateHud(h => { h.dome.width = v; })} onReset={() => updateHud(h => { h.dome.width = DEFAULT_HUD_ARTWORK_CONTROLS.dome.width; })} />
                <NumberField label="Dome Height" value={hud.dome.height} min={10} max={600} step={1} onChange={(v) => updateHud(h => { h.dome.height = v; })} onReset={() => updateHud(h => { h.dome.height = DEFAULT_HUD_ARTWORK_CONTROLS.dome.height; })} />
                <NumberField label="Center X" value={hud.dome.cx} min={0} max={880} step={1} onChange={(v) => updateHud(h => { h.dome.cx = v; })} onReset={() => updateHud(h => { h.dome.cx = DEFAULT_HUD_ARTWORK_CONTROLS.dome.cx; })} />
                <NumberField label="Center Y" value={hud.dome.cy} min={0} max={360} step={1} onChange={(v) => updateHud(h => { h.dome.cy = v; })} onReset={() => updateHud(h => { h.dome.cy = DEFAULT_HUD_ARTWORK_CONTROLS.dome.cy; })} />
                <NumberField label="Dome Top Radius" value={hud.dome.topRadius} min={0} max={300} step={1} onChange={(v) => updateHud(h => { h.dome.topRadius = v; })} onReset={() => updateHud(h => { h.dome.topRadius = DEFAULT_HUD_ARTWORK_CONTROLS.dome.topRadius; })} />
              </Section>
            )}

            {hudTuningSection === "styles" && (
              <>
                <Section title="Colors & Fills">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Styles",
                        onClick: () => copyJson({
                          panelTop: hud.panelTop,
                          panelMid: hud.panelMid,
                          panelBottom: hud.panelBottom,
                          panelGlassOpacity: hud.panelGlassOpacity,
                          wingStyle: hud.wingStyle,
                          dome: {
                            edgeColor: hud.dome.edgeColor,
                            glowOpacity: hud.dome.glowOpacity,
                          },
                        }),
                      },
                      {
                        label: "Reset Styles",
                        onClick: () => confirmBundleReset("HUD styles", () => updateHud((next) => {
                          next.panelTop = DEFAULT_HUD_ARTWORK_CONTROLS.panelTop;
                          next.panelMid = DEFAULT_HUD_ARTWORK_CONTROLS.panelMid;
                          next.panelBottom = DEFAULT_HUD_ARTWORK_CONTROLS.panelBottom;
                          next.panelGlassOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.panelGlassOpacity;
                          next.wingStyle = { ...DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle };
                          next.dome.edgeColor = DEFAULT_HUD_ARTWORK_CONTROLS.dome.edgeColor;
                          next.dome.glowOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.dome.glowOpacity;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <ColorField label="Panel Top" value={hud.panelTop} onChange={(v) => updateHud(h => { h.panelTop = v; })} onReset={() => updateHud(h => { h.panelTop = DEFAULT_HUD_ARTWORK_CONTROLS.panelTop; })} />
                  <ColorField label="Panel Mid" value={hud.panelMid} onChange={(v) => updateHud(h => { h.panelMid = v; })} onReset={() => updateHud(h => { h.panelMid = DEFAULT_HUD_ARTWORK_CONTROLS.panelMid; })} />
                  <ColorField label="Panel Bottom" value={hud.panelBottom} onChange={(v) => updateHud(h => { h.panelBottom = v; })} onReset={() => updateHud(h => { h.panelBottom = DEFAULT_HUD_ARTWORK_CONTROLS.panelBottom; })} />
                  <NumberField label="Glass Opacity" value={hud.panelGlassOpacity} min={0} max={1} step={0.01} onChange={(v) => updateHud(h => { h.panelGlassOpacity = v; })} onReset={() => updateHud(h => { h.panelGlassOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.panelGlassOpacity; })} />
                </Section>
                <Section title="Wing & Clamp Styling">
                  <ColorField label="Edge Color" value={hud.wingStyle.edgeColor} onChange={(v) => updateHud(h => { h.wingStyle.edgeColor = v; })} onReset={() => updateHud(h => { h.wingStyle.edgeColor = DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle.edgeColor; })} />
                  <NumberField label="Edge Width" value={hud.wingStyle.edgeWidth} min={0} max={10} step={0.5} onChange={(v) => updateHud(h => { h.wingStyle.edgeWidth = v; })} onReset={() => updateHud(h => { h.wingStyle.edgeWidth = DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle.edgeWidth; })} />
                  <ColorField label="Glow Color" value={hud.wingStyle.glowColor} onChange={(v) => updateHud(h => { h.wingStyle.glowColor = v; })} onReset={() => updateHud(h => { h.wingStyle.glowColor = DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle.glowColor; })} />
                  <NumberField label="Glow Width" value={hud.wingStyle.glowWidth} min={0} max={40} step={1} onChange={(v) => updateHud(h => { h.wingStyle.glowWidth = v; })} onReset={() => updateHud(h => { h.wingStyle.glowWidth = DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle.glowWidth; })} />
                  <NumberField label="Glow Opacity" value={hud.wingStyle.glowOpacity} min={0} max={1} step={0.01} onChange={(v) => updateHud(h => { h.wingStyle.glowOpacity = v; })} onReset={() => updateHud(h => { h.wingStyle.glowOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.wingStyle.glowOpacity; })} />
                </Section>
                <Section title="Dome Styling">
                  <ColorField label="Dome Edge" value={hud.dome.edgeColor} onChange={(v) => updateHud(h => { h.dome.edgeColor = v; })} onReset={() => updateHud(h => { h.dome.edgeColor = DEFAULT_HUD_ARTWORK_CONTROLS.dome.edgeColor; })} />
                  <NumberField label="Dome Glow Opacity" value={hud.dome.glowOpacity} min={0} max={1} step={0.01} onChange={(v) => updateHud(h => { h.dome.glowOpacity = v; })} onReset={() => updateHud(h => { h.dome.glowOpacity = DEFAULT_HUD_ARTWORK_CONTROLS.dome.glowOpacity; })} />
                </Section>
              </>
            )}

            {hudTuningSection === "buttons" && renderHudButtons()}

            {hudTuningSection === "cardInHand" && (
              <Section title="Card Fan Layout">
                <ActionBar
                  actions={[
                    {
                      label: "Copy Card Fan",
                      onClick: () => copyJson({
                        cardFan: document.cardFan,
                        renderToggles: {
                          cardFan: document.renderToggles.cardFan,
                        },
                      }),
                    },
                    {
                      label: "Reset Card Fan",
                      onClick: () => confirmBundleReset("card fan", () => updateDoc((draft) => {
                        draft.cardFan = { ...DEFAULT_CARD_FAN_CONTROLS };
                        draft.renderToggles.cardFan = DEFAULT_RENDER_TOGGLES.cardFan;
                      })),
                      tone: "danger",
                    },
                  ]}
                />
                <NumberField label="Card Count" value={document.cardFan.cardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.cardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.cardCount = DEFAULT_CARD_FAN_CONTROLS.cardCount; })} />
                <NumberField label="Min Cards" value={document.cardFan.minCardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.minCardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.minCardCount = DEFAULT_CARD_FAN_CONTROLS.minCardCount; })} />
                <NumberField label="Max Cards" value={document.cardFan.maxCardCount} min={1} max={20} step={1} onChange={(v) => updateDoc(d => { d.cardFan.maxCardCount = v; })} onReset={() => updateDoc(d => { d.cardFan.maxCardCount = DEFAULT_CARD_FAN_CONTROLS.maxCardCount; })} />
                <NumberField label="Orbit Radius" value={document.cardFan.radiusScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.radiusScale = v; })} onReset={() => updateDoc(d => { d.cardFan.radiusScale = DEFAULT_CARD_FAN_CONTROLS.radiusScale; })} />
                <NumberField label="Radius Offset" value={document.cardFan.radiusOffset} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.radiusOffset = v; })} onReset={() => updateDoc(d => { d.cardFan.radiusOffset = DEFAULT_CARD_FAN_CONTROLS.radiusOffset; })} />
                <NumberField label="Width Scale" value={document.cardFan.cardWidthScale} min={0.1} max={1.0} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.cardWidthScale = v; })} onReset={() => updateDoc(d => { d.cardFan.cardWidthScale = DEFAULT_CARD_FAN_CONTROLS.cardWidthScale; })} />
                <NumberField label="Height Scale" value={document.cardFan.cardHeightScale} min={0.1} max={1.4} step={0.01} onChange={(v) => updateDoc(d => { d.cardFan.cardHeightScale = v; })} onReset={() => updateDoc(d => { d.cardFan.cardHeightScale = DEFAULT_CARD_FAN_CONTROLS.cardHeightScale; })} />
                <NumberField label="Arc Min" value={document.cardFan.arcMin} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMin = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMin = DEFAULT_CARD_FAN_CONTROLS.arcMin; })} />
                <NumberField label="Arc Max" value={document.cardFan.arcMax} min={0} max={180} step={1} onChange={(v) => updateDoc(d => { d.cardFan.arcMax = v; })} onReset={() => updateDoc(d => { d.cardFan.arcMax = DEFAULT_CARD_FAN_CONTROLS.arcMax; })} />
                <NumberField label="Fan Tilt" value={document.cardFan.fanTilt} min={-90} max={90} step={1} onChange={(v) => updateDoc(d => { d.cardFan.fanTilt = v; })} onReset={() => updateDoc(d => { d.cardFan.fanTilt = DEFAULT_CARD_FAN_CONTROLS.fanTilt; })} />
                <NumberField label="Offset X" value={document.cardFan.centerOffsetX} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetX = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetX = DEFAULT_CARD_FAN_CONTROLS.centerOffsetX; })} />
                <NumberField label="Offset Y" value={document.cardFan.centerOffsetY} min={-200} max={200} step={1} onChange={(v) => updateDoc(d => { d.cardFan.centerOffsetY = v; })} onReset={() => updateDoc(d => { d.cardFan.centerOffsetY = DEFAULT_CARD_FAN_CONTROLS.centerOffsetY; })} />
                <CheckboxField label="Disable Viewport Scale" value={document.cardFan.disableViewportScale} onChange={(v) => updateDoc(d => { d.cardFan.disableViewportScale = v; })} />
              </Section>
            )}
          </div>
        )}
        {workspaceSection === "table" && renderTableWorkspace()}
        {workspaceSection === "scoreboard" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy Scoreboard Bundle", onClick: copyScoreboardBundle },
                { label: "Reset Scoreboard Bundle", onClick: () => confirmBundleReset("scoreboard bundle", resetScoreboardBundle), tone: "danger" },
              ]}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(141,255,176,0.1)' }}>
              {([
                { key: "frame", label: "Frame" },
                { key: "header", label: "Header" },
                { key: "table", label: "Table" },
              ] as Array<{ key: ScoreboardSectionKey; label: string }>).map((tab) => (
                <TabButton
                  key={tab.key}
                  compact
                  active={activeScoreboardSection === tab.key}
                  onClick={() => setActiveScoreboardSection(tab.key)}
                >
                  {tab.label}
                </TabButton>
              ))}
            </div>

            {activeScoreboardSection === "frame" && (
              <>
                <Section title="Bounds">
                  <ActionBar
                    actions={[
                      { label: "Copy Frame", onClick: copyScoreboardBundle },
                      { label: "Reset Frame", onClick: () => confirmBundleReset("scoreboard frame", resetScoreboardBundle), tone: "danger" },
                    ]}
                  />
                  <CheckboxField label="Scoreboard Frame" value={resolvedEditorOverlayVisibility.scoreboard} onChange={(value) => updateEditorOverlayVisibility((next) => { next.scoreboard = value; })} />
                  <CheckboxField label="Header Block" value={resolvedEditorOverlayVisibility.scoreboardHeader} onChange={(value) => updateEditorOverlayVisibility((next) => { next.scoreboardHeader = value; })} />
                  <CheckboxField label="Rows and Dividers" value={resolvedEditorOverlayVisibility.scoreboardRows} onChange={(value) => updateEditorOverlayVisibility((next) => { next.scoreboardRows = value; })} />
                </Section>
                <Section title="Placement & Scale">
                  <CheckboxField label="Show Scoreboard" value={renderToggles.scoreboard} onChange={(value) => updateRenderToggles((next) => { next.scoreboard = value; })} />
                  <NumberField label="Overall Scale" value={scoreboard.overallScale} min={0.2} max={2} step={0.01} onChange={(v) => updateScoreboard((next) => { next.overallScale = v; })} onReset={() => updateScoreboard((next) => { next.overallScale = DEFAULT_SCOREBOARD_CONTROLS.overallScale; })} />
                  <SelectField
                    label="Fit Mode"
                    value={resolvedScoreboardStageBlock.fitMode}
                    options={STAGE_FIT_OPTIONS}
                    onChange={(value) => updateScoreboardStageBlock((block) => { block.fitMode = value as CardGameStageFitMode; })}
                  />
                  <SelectField
                    label="Anchor X"
                    value={resolvedScoreboardStageBlock.anchorX}
                    options={STAGE_ANCHOR_X_OPTIONS}
                    onChange={(value) => updateScoreboardStageBlock((block) => { block.anchorX = value as "start" | "center" | "end"; })}
                  />
                  <SelectField
                    label="Anchor Y"
                    value={resolvedScoreboardStageBlock.anchorY}
                    options={STAGE_ANCHOR_Y_OPTIONS}
                    onChange={(value) => updateScoreboardStageBlock((block) => { block.anchorY = value as "start" | "center" | "end"; })}
                  />
                  <NumberField label="Offset X" value={resolvedScoreboardStageBlock.offsetX} min={-400} max={400} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.offsetX = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.offsetX = DEFAULT_SCOREBOARD_STAGE_BLOCK.offsetX; })} />
                  <NumberField label="Offset Y" value={resolvedScoreboardStageBlock.offsetY} min={-400} max={400} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.offsetY = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.offsetY = DEFAULT_SCOREBOARD_STAGE_BLOCK.offsetY; })} />
                  <NumberField label="Inset Top" value={resolvedScoreboardStageBlock.insetTop} min={0} max={320} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.insetTop = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.insetTop = DEFAULT_SCOREBOARD_STAGE_BLOCK.insetTop; })} />
                  <NumberField label="Inset Right" value={resolvedScoreboardStageBlock.insetRight} min={0} max={320} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.insetRight = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.insetRight = DEFAULT_SCOREBOARD_STAGE_BLOCK.insetRight; })} />
                  <NumberField label="Inset Bottom" value={resolvedScoreboardStageBlock.insetBottom} min={0} max={320} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.insetBottom = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.insetBottom = DEFAULT_SCOREBOARD_STAGE_BLOCK.insetBottom; })} />
                  <NumberField label="Inset Left" value={resolvedScoreboardStageBlock.insetLeft} min={0} max={320} step={1} onChange={(v) => updateScoreboardStageBlock((block) => { block.insetLeft = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.insetLeft = DEFAULT_SCOREBOARD_STAGE_BLOCK.insetLeft; })} />
                  <NumberField label="Min Scale" value={resolvedScoreboardStageBlock.minScale} min={0.1} max={2} step={0.01} onChange={(v) => updateScoreboardStageBlock((block) => { block.minScale = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.minScale = DEFAULT_SCOREBOARD_STAGE_BLOCK.minScale; })} />
                  <NumberField label="Max Scale" value={resolvedScoreboardStageBlock.maxScale} min={0.1} max={2} step={0.01} onChange={(v) => updateScoreboardStageBlock((block) => { block.maxScale = v; })} onReset={() => updateScoreboardStageBlock((block) => { block.maxScale = DEFAULT_SCOREBOARD_STAGE_BLOCK.maxScale; })} />
                </Section>

                <Section title="Frame Layout and Colors">
                  <NumberField label="Width" value={scoreboard.width} min={420} max={1100} step={1} onChange={(v) => updateScoreboard((next) => { next.width = v; })} onReset={() => updateScoreboard((next) => { next.width = DEFAULT_SCOREBOARD_CONTROLS.width; })} />
                  <NumberField label="Height" value={scoreboard.height} min={210} max={520} step={1} onChange={(v) => updateScoreboard((next) => { next.height = v; })} onReset={() => updateScoreboard((next) => { next.height = DEFAULT_SCOREBOARD_CONTROLS.height; })} />
                  <NumberField label="Outer Radius" value={scoreboard.outerRadius} min={0} max={70} step={1} onChange={(v) => updateScoreboard((next) => { next.outerRadius = v; })} onReset={() => updateScoreboard((next) => { next.outerRadius = DEFAULT_SCOREBOARD_CONTROLS.outerRadius; })} />
                  <NumberField label="Panel Inset" value={scoreboard.panelInset} min={0} max={60} step={1} onChange={(v) => updateScoreboard((next) => { next.panelInset = v; })} onReset={() => updateScoreboard((next) => { next.panelInset = DEFAULT_SCOREBOARD_CONTROLS.panelInset; })} />
                  <NumberField label="Border Width" value={scoreboard.borderWidth} min={0} max={20} step={0.5} onChange={(v) => updateScoreboard((next) => { next.borderWidth = v; })} onReset={() => updateScoreboard((next) => { next.borderWidth = DEFAULT_SCOREBOARD_CONTROLS.borderWidth; })} />
                  <NumberField label="Glow Blur" value={scoreboard.glowBlur} min={0} max={26} step={1} onChange={(v) => updateScoreboard((next) => { next.glowBlur = v; })} onReset={() => updateScoreboard((next) => { next.glowBlur = DEFAULT_SCOREBOARD_CONTROLS.glowBlur; })} />
                  <NumberField label="Text Kern" value={scoreboard.overallLetterSpacing} min={-6} max={12} step={0.5} onChange={(v) => updateScoreboard((next) => { next.overallLetterSpacing = v; })} onReset={() => updateScoreboard((next) => { next.overallLetterSpacing = DEFAULT_SCOREBOARD_CONTROLS.overallLetterSpacing; })} />
                  <NumberField label="Text Y All" value={scoreboard.overallTextYOffset} min={-30} max={30} step={1} onChange={(v) => updateScoreboard((next) => { next.overallTextYOffset = v; })} onReset={() => updateScoreboard((next) => { next.overallTextYOffset = DEFAULT_SCOREBOARD_CONTROLS.overallTextYOffset; })} />
                  <ColorField label="BG Top" value={scoreboard.bgTop} onChange={(v) => updateScoreboard((next) => { next.bgTop = v; })} onReset={() => updateScoreboard((next) => { next.bgTop = DEFAULT_SCOREBOARD_CONTROLS.bgTop; })} />
                  <ColorField label="BG Mid" value={scoreboard.bgMid} onChange={(v) => updateScoreboard((next) => { next.bgMid = v; })} onReset={() => updateScoreboard((next) => { next.bgMid = DEFAULT_SCOREBOARD_CONTROLS.bgMid; })} />
                  <ColorField label="BG Bottom" value={scoreboard.bgBottom} onChange={(v) => updateScoreboard((next) => { next.bgBottom = v; })} onReset={() => updateScoreboard((next) => { next.bgBottom = DEFAULT_SCOREBOARD_CONTROLS.bgBottom; })} />
                  <ColorField label="Edge Light" value={scoreboard.edgeLight} onChange={(v) => updateScoreboard((next) => { next.edgeLight = v; })} onReset={() => updateScoreboard((next) => { next.edgeLight = DEFAULT_SCOREBOARD_CONTROLS.edgeLight; })} />
                  <ColorField label="Edge Dark" value={scoreboard.edgeDark} onChange={(v) => updateScoreboard((next) => { next.edgeDark = v; })} onReset={() => updateScoreboard((next) => { next.edgeDark = DEFAULT_SCOREBOARD_CONTROLS.edgeDark; })} />
                </Section>
              </>
            )}

            {activeScoreboardSection === "header" && (
              <>
                <Section title="Header Data">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Header",
                        onClick: () => copyJson({
                          roundLabel: scoreboard.roundLabel,
                          round: scoreboard.round,
                          ofLabel: scoreboard.ofLabel,
                          totalRounds: scoreboard.totalRounds,
                          header: {
                            headerHeight: scoreboard.headerHeight,
                            headerGap: scoreboard.headerGap,
                            headerPadX: scoreboard.headerPadX,
                            headerBandTopInset: scoreboard.headerBandTopInset,
                            headerBandBottomInset: scoreboard.headerBandBottomInset,
                            headerOuterPadY: scoreboard.headerOuterPadY,
                            headerBgRadius: scoreboard.headerBgRadius,
                            headerBgOpacity: scoreboard.headerBgOpacity,
                            headerBgStrokeWidth: scoreboard.headerBgStrokeWidth,
                            headerBoxWidth: scoreboard.headerBoxWidth,
                            headerBoxHeight: scoreboard.headerBoxHeight,
                            headerValueBoxRadius: scoreboard.headerValueBoxRadius,
                            headerBoxTextPadding: scoreboard.headerBoxTextPadding,
                            headerValueAutoFit: scoreboard.headerValueAutoFit,
                            headerLabelTextSize: scoreboard.headerLabelTextSize,
                            headerValueAutoSize: scoreboard.headerValueAutoSize,
                            headerValueSizeScale: scoreboard.headerValueSizeScale,
                            headerValueTextSize: scoreboard.headerValueTextSize,
                            headerTextYOffset: scoreboard.headerTextYOffset,
                            textYellow: scoreboard.textYellow,
                            textRed: scoreboard.textRed,
                            textRedStroke: scoreboard.textRedStroke,
                            headerBgFill: scoreboard.headerBgFill,
                            headerBgStroke: scoreboard.headerBgStroke,
                            headerValueBoxFill: scoreboard.headerValueBoxFill,
                            headerValueBoxStroke: scoreboard.headerValueBoxStroke,
                          },
                        }),
                      },
                      {
                        label: "Reset Header",
                        onClick: () => confirmBundleReset("scoreboard header", () => updateScoreboard((next) => {
                          next.roundLabel = DEFAULT_SCOREBOARD_CONTROLS.roundLabel;
                          next.round = DEFAULT_SCOREBOARD_CONTROLS.round;
                          next.ofLabel = DEFAULT_SCOREBOARD_CONTROLS.ofLabel;
                          next.totalRounds = DEFAULT_SCOREBOARD_CONTROLS.totalRounds;
                          next.headerHeight = DEFAULT_SCOREBOARD_CONTROLS.headerHeight;
                          next.headerGap = DEFAULT_SCOREBOARD_CONTROLS.headerGap;
                          next.headerPadX = DEFAULT_SCOREBOARD_CONTROLS.headerPadX;
                          next.headerBandTopInset = DEFAULT_SCOREBOARD_CONTROLS.headerBandTopInset;
                          next.headerBandBottomInset = DEFAULT_SCOREBOARD_CONTROLS.headerBandBottomInset;
                          next.headerOuterPadY = DEFAULT_SCOREBOARD_CONTROLS.headerOuterPadY;
                          next.headerBgRadius = DEFAULT_SCOREBOARD_CONTROLS.headerBgRadius;
                          next.headerBgOpacity = DEFAULT_SCOREBOARD_CONTROLS.headerBgOpacity;
                          next.headerBgStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.headerBgStrokeWidth;
                          next.headerBoxWidth = DEFAULT_SCOREBOARD_CONTROLS.headerBoxWidth;
                          next.headerBoxHeight = DEFAULT_SCOREBOARD_CONTROLS.headerBoxHeight;
                          next.headerValueBoxRadius = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxRadius;
                          next.headerBoxTextPadding = DEFAULT_SCOREBOARD_CONTROLS.headerBoxTextPadding;
                          next.headerValueAutoFit = DEFAULT_SCOREBOARD_CONTROLS.headerValueAutoFit;
                          next.headerLabelTextSize = DEFAULT_SCOREBOARD_CONTROLS.headerLabelTextSize;
                          next.headerValueAutoSize = DEFAULT_SCOREBOARD_CONTROLS.headerValueAutoSize;
                          next.headerValueSizeScale = DEFAULT_SCOREBOARD_CONTROLS.headerValueSizeScale;
                          next.headerValueTextSize = DEFAULT_SCOREBOARD_CONTROLS.headerValueTextSize;
                          next.headerTextYOffset = DEFAULT_SCOREBOARD_CONTROLS.headerTextYOffset;
                          next.textYellow = DEFAULT_SCOREBOARD_CONTROLS.textYellow;
                          next.textRed = DEFAULT_SCOREBOARD_CONTROLS.textRed;
                          next.textRedStroke = DEFAULT_SCOREBOARD_CONTROLS.textRedStroke;
                          next.headerBgFill = DEFAULT_SCOREBOARD_CONTROLS.headerBgFill;
                          next.headerBgStroke = DEFAULT_SCOREBOARD_CONTROLS.headerBgStroke;
                          next.headerValueBoxFill = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxFill;
                          next.headerValueBoxStroke = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxStroke;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <TextField label="Round Label" value={scoreboard.roundLabel} onChange={(value) => updateScoreboard((next) => { next.roundLabel = value; })} />
                  <NumberField label="Round" value={scoreboard.round} min={0} max={99} step={1} onChange={(v) => updateScoreboard((next) => { next.round = v; })} onReset={() => updateScoreboard((next) => { next.round = DEFAULT_SCOREBOARD_CONTROLS.round; })} />
                  <TextField label="Of Label" value={scoreboard.ofLabel} onChange={(value) => updateScoreboard((next) => { next.ofLabel = value; })} />
                  <NumberField label="Total" value={scoreboard.totalRounds} min={0} max={99} step={1} onChange={(v) => updateScoreboard((next) => { next.totalRounds = v; })} onReset={() => updateScoreboard((next) => { next.totalRounds = DEFAULT_SCOREBOARD_CONTROLS.totalRounds; })} />
                </Section>
                <Section title="Header Layout">
                  <NumberField label="Header Height" value={scoreboard.headerHeight} min={44} max={120} step={1} onChange={(v) => updateScoreboard((next) => { next.headerHeight = v; })} onReset={() => updateScoreboard((next) => { next.headerHeight = DEFAULT_SCOREBOARD_CONTROLS.headerHeight; })} />
                  <NumberField label="Header Gap" value={scoreboard.headerGap} min={0} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.headerGap = v; })} onReset={() => updateScoreboard((next) => { next.headerGap = DEFAULT_SCOREBOARD_CONTROLS.headerGap; })} />
                  <NumberField label="Header Pad X" value={scoreboard.headerPadX} min={0} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.headerPadX = v; })} onReset={() => updateScoreboard((next) => { next.headerPadX = DEFAULT_SCOREBOARD_CONTROLS.headerPadX; })} />
                  <NumberField label="Band Top" value={scoreboard.headerBandTopInset} min={-20} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBandTopInset = v; })} onReset={() => updateScoreboard((next) => { next.headerBandTopInset = DEFAULT_SCOREBOARD_CONTROLS.headerBandTopInset; })} />
                  <NumberField label="Band Bottom" value={scoreboard.headerBandBottomInset} min={-20} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBandBottomInset = v; })} onReset={() => updateScoreboard((next) => { next.headerBandBottomInset = DEFAULT_SCOREBOARD_CONTROLS.headerBandBottomInset; })} />
                  <NumberField label="Inner Y" value={scoreboard.headerOuterPadY} min={0} max={30} step={1} onChange={(v) => updateScoreboard((next) => { next.headerOuterPadY = v; })} onReset={() => updateScoreboard((next) => { next.headerOuterPadY = DEFAULT_SCOREBOARD_CONTROLS.headerOuterPadY; })} />
                </Section>
                <Section title="Header Background Box">
                  <NumberField label="BG Radius" value={scoreboard.headerBgRadius} min={0} max={30} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBgRadius = v; })} onReset={() => updateScoreboard((next) => { next.headerBgRadius = DEFAULT_SCOREBOARD_CONTROLS.headerBgRadius; })} />
                  <NumberField label="BG Opacity" value={scoreboard.headerBgOpacity} min={0} max={1} step={0.01} onChange={(v) => updateScoreboard((next) => { next.headerBgOpacity = v; })} onReset={() => updateScoreboard((next) => { next.headerBgOpacity = DEFAULT_SCOREBOARD_CONTROLS.headerBgOpacity; })} />
                  <NumberField label="BG Stroke" value={scoreboard.headerBgStrokeWidth} min={0} max={8} step={0.5} onChange={(v) => updateScoreboard((next) => { next.headerBgStrokeWidth = v; })} onReset={() => updateScoreboard((next) => { next.headerBgStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.headerBgStrokeWidth; })} />
                </Section>
                <Section title="Black Value Boxes">
                  <NumberField label="Box Width" value={scoreboard.headerBoxWidth} min={28} max={160} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBoxWidth = v; })} onReset={() => updateScoreboard((next) => { next.headerBoxWidth = DEFAULT_SCOREBOARD_CONTROLS.headerBoxWidth; })} />
                  <NumberField label="Box Height" value={scoreboard.headerBoxHeight} min={16} max={80} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBoxHeight = v; })} onReset={() => updateScoreboard((next) => { next.headerBoxHeight = DEFAULT_SCOREBOARD_CONTROLS.headerBoxHeight; })} />
                  <NumberField label="Box Radius" value={scoreboard.headerValueBoxRadius} min={0} max={24} step={1} onChange={(v) => updateScoreboard((next) => { next.headerValueBoxRadius = v; })} onReset={() => updateScoreboard((next) => { next.headerValueBoxRadius = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxRadius; })} />
                  <NumberField label="Value Pad" value={scoreboard.headerBoxTextPadding} min={0} max={24} step={1} onChange={(v) => updateScoreboard((next) => { next.headerBoxTextPadding = v; })} onReset={() => updateScoreboard((next) => { next.headerBoxTextPadding = DEFAULT_SCOREBOARD_CONTROLS.headerBoxTextPadding; })} />
                  <CheckboxField label="Stretch Fit" value={scoreboard.headerValueAutoFit} onChange={(value) => updateScoreboard((next) => { next.headerValueAutoFit = value; })} />
                </Section>
                <Section title="Header Text and Colors">
                  <NumberField label="Label Size" value={scoreboard.headerLabelTextSize} min={16} max={60} step={1} onChange={(v) => updateScoreboard((next) => { next.headerLabelTextSize = v; })} onReset={() => updateScoreboard((next) => { next.headerLabelTextSize = DEFAULT_SCOREBOARD_CONTROLS.headerLabelTextSize; })} />
                  <CheckboxField label="Auto Value" value={scoreboard.headerValueAutoSize} onChange={(value) => updateScoreboard((next) => { next.headerValueAutoSize = value; })} />
                  <NumberField label="Value Scale" value={scoreboard.headerValueSizeScale} min={0.35} max={1.25} step={0.01} onChange={(v) => updateScoreboard((next) => { next.headerValueSizeScale = v; })} onReset={() => updateScoreboard((next) => { next.headerValueSizeScale = DEFAULT_SCOREBOARD_CONTROLS.headerValueSizeScale; })} />
                  <NumberField label="Value Size" value={scoreboard.headerValueTextSize} min={16} max={80} step={1} onChange={(v) => updateScoreboard((next) => { next.headerValueTextSize = v; })} onReset={() => updateScoreboard((next) => { next.headerValueTextSize = DEFAULT_SCOREBOARD_CONTROLS.headerValueTextSize; })} />
                  <NumberField label="Text Y" value={scoreboard.headerTextYOffset} min={-20} max={20} step={1} onChange={(v) => updateScoreboard((next) => { next.headerTextYOffset = v; })} onReset={() => updateScoreboard((next) => { next.headerTextYOffset = DEFAULT_SCOREBOARD_CONTROLS.headerTextYOffset; })} />
                  <ColorField label="Yellow Text" value={scoreboard.textYellow} onChange={(v) => updateScoreboard((next) => { next.textYellow = v; })} onReset={() => updateScoreboard((next) => { next.textYellow = DEFAULT_SCOREBOARD_CONTROLS.textYellow; })} />
                  <ColorField label="Red Text" value={scoreboard.textRed} onChange={(v) => updateScoreboard((next) => { next.textRed = v; })} onReset={() => updateScoreboard((next) => { next.textRed = DEFAULT_SCOREBOARD_CONTROLS.textRed; })} />
                  <ColorField label="Red Stroke" value={scoreboard.textRedStroke} onChange={(v) => updateScoreboard((next) => { next.textRedStroke = v; })} onReset={() => updateScoreboard((next) => { next.textRedStroke = DEFAULT_SCOREBOARD_CONTROLS.textRedStroke; })} />
                  <ColorField label="BG Fill" value={scoreboard.headerBgFill} onChange={(v) => updateScoreboard((next) => { next.headerBgFill = v; })} onReset={() => updateScoreboard((next) => { next.headerBgFill = DEFAULT_SCOREBOARD_CONTROLS.headerBgFill; })} />
                  <ColorField label="BG Stroke" value={scoreboard.headerBgStroke} onChange={(v) => updateScoreboard((next) => { next.headerBgStroke = v; })} onReset={() => updateScoreboard((next) => { next.headerBgStroke = DEFAULT_SCOREBOARD_CONTROLS.headerBgStroke; })} />
                  <ColorField label="Box Fill" value={scoreboard.headerValueBoxFill} onChange={(v) => updateScoreboard((next) => { next.headerValueBoxFill = v; })} onReset={() => updateScoreboard((next) => { next.headerValueBoxFill = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxFill; })} />
                  <ColorField label="Box Stroke" value={scoreboard.headerValueBoxStroke} onChange={(v) => updateScoreboard((next) => { next.headerValueBoxStroke = v; })} onReset={() => updateScoreboard((next) => { next.headerValueBoxStroke = DEFAULT_SCOREBOARD_CONTROLS.headerValueBoxStroke; })} />
                </Section>
              </>
            )}

            {activeScoreboardSection === "table" && (
              <>
                <Section title="Table Rows">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Table",
                        onClick: () => copyJson({
                          rows: scoreboard.rows,
                          table: {
                            tableMargin: scoreboard.tableMargin,
                            tableDividerPercent: scoreboard.tableDividerPercent,
                            tableDividerOffset: scoreboard.tableDividerOffset,
                            cellCornerRadius: scoreboard.cellCornerRadius,
                            rowStrokeWidth: scoreboard.rowStrokeWidth,
                            bevelOpacity: scoreboard.bevelOpacity,
                            panelTop: scoreboard.panelTop,
                            panelBottom: scoreboard.panelBottom,
                            darkStroke: scoreboard.darkStroke,
                            showIcons: scoreboard.showIcons,
                            textRed: scoreboard.textRed,
                            textRedStroke: scoreboard.textRedStroke,
                            textYellow: scoreboard.textYellow,
                            iconX: scoreboard.iconX,
                            iconOffsetY: scoreboard.iconOffsetY,
                            iconSize: scoreboard.iconSize,
                            labelOffsetX: scoreboard.labelOffsetX,
                            labelTextSize: scoreboard.labelTextSize,
                            valueTextSize: scoreboard.valueTextSize,
                            rowTextYOffset: scoreboard.rowTextYOffset,
                            cellPaddingX: scoreboard.cellPaddingX,
                            coinDollarFontSize: scoreboard.coinDollarFontSize,
                            coinDollarTextLength: scoreboard.coinDollarTextLength,
                            coinDollarY: scoreboard.coinDollarY,
                            coinDollarStrokeWidth: scoreboard.coinDollarStrokeWidth,
                          },
                        }),
                      },
                      {
                        label: "Reset Table",
                        onClick: () => confirmBundleReset("scoreboard table", () => updateScoreboard((next) => {
                          next.rows = cloneScoreboardRows(DEFAULT_SCOREBOARD_CONTROLS.rows ?? []);
                          next.tableMargin = DEFAULT_SCOREBOARD_CONTROLS.tableMargin;
                          next.tableDividerPercent = DEFAULT_SCOREBOARD_CONTROLS.tableDividerPercent;
                          next.tableDividerOffset = DEFAULT_SCOREBOARD_CONTROLS.tableDividerOffset;
                          next.cellCornerRadius = DEFAULT_SCOREBOARD_CONTROLS.cellCornerRadius;
                          next.rowStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.rowStrokeWidth;
                          next.bevelOpacity = DEFAULT_SCOREBOARD_CONTROLS.bevelOpacity;
                          next.panelTop = DEFAULT_SCOREBOARD_CONTROLS.panelTop;
                          next.panelBottom = DEFAULT_SCOREBOARD_CONTROLS.panelBottom;
                          next.darkStroke = DEFAULT_SCOREBOARD_CONTROLS.darkStroke;
                          next.showIcons = DEFAULT_SCOREBOARD_CONTROLS.showIcons;
                          next.textRed = DEFAULT_SCOREBOARD_CONTROLS.textRed;
                          next.textRedStroke = DEFAULT_SCOREBOARD_CONTROLS.textRedStroke;
                          next.textYellow = DEFAULT_SCOREBOARD_CONTROLS.textYellow;
                          next.iconX = DEFAULT_SCOREBOARD_CONTROLS.iconX;
                          next.iconOffsetY = DEFAULT_SCOREBOARD_CONTROLS.iconOffsetY;
                          next.iconSize = DEFAULT_SCOREBOARD_CONTROLS.iconSize;
                          next.labelOffsetX = DEFAULT_SCOREBOARD_CONTROLS.labelOffsetX;
                          next.labelTextSize = DEFAULT_SCOREBOARD_CONTROLS.labelTextSize;
                          next.valueTextSize = DEFAULT_SCOREBOARD_CONTROLS.valueTextSize;
                          next.rowTextYOffset = DEFAULT_SCOREBOARD_CONTROLS.rowTextYOffset;
                          next.cellPaddingX = DEFAULT_SCOREBOARD_CONTROLS.cellPaddingX;
                          next.coinDollarFontSize = DEFAULT_SCOREBOARD_CONTROLS.coinDollarFontSize;
                          next.coinDollarTextLength = DEFAULT_SCOREBOARD_CONTROLS.coinDollarTextLength;
                          next.coinDollarY = DEFAULT_SCOREBOARD_CONTROLS.coinDollarY;
                          next.coinDollarStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.coinDollarStrokeWidth;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <div className="game-screen__hud-button-label-grid">
                    {scoreboard.rows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className={`game-screen__hud-button-modal-tab ${selectedScoreboardRow?.id === row.id ? "game-screen__hud-button-modal-tab--active" : ""}`}
                        onClick={() => setSelectedScoreboardRowId(row.id)}
                      >
                        {row.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="game-screen__hud-button-modal-tab"
                      onClick={() => updateScoreboard((next) => {
                        const row = createScoreboardRowDefaults(next, next.rows.length);
                        next.rows.push(row);
                        setSelectedScoreboardRowId(row.id);
                      })}
                    >
                      Add Row
                    </button>
                    {selectedScoreboardRow ? (
                      <button
                        type="button"
                        className="game-screen__hud-button-modal-tab"
                        onClick={() => {
                          const rowId = selectedScoreboardRow.id;
                          updateScoreboard((next) => {
                            next.rows = next.rows.filter((row) => row.id !== rowId);
                          });
                          setSelectedScoreboardRowId(null);
                        }}
                      >
                        Remove Selected
                      </button>
                    ) : null}
                  </div>
                  {selectedScoreboardRow ? (
                    <>
                      <TextField label="Row ID" value={selectedScoreboardRow.id} onChange={(value) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.id = value; })} />
                      <SelectField label="Icon" value={selectedScoreboardRow.icon} options={SCOREBOARD_ICON_OPTIONS} onChange={(value) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.icon = value as CardGameScoreboardIcon; })} />
                      <TextField label="Label" value={selectedScoreboardRow.label} onChange={(value) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.label = value; })} />
                      <TextField label="Value" value={selectedScoreboardRow.value} onChange={(value) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.value = value; })} />
                      <TextField label="Binding" value={selectedScoreboardRow.valueBinding ?? ""} onChange={(value) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.valueBinding = value || undefined; })} />
                      <NumberField label="Icon X" value={selectedScoreboardRow.iconX} min={20} max={140} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.iconX = v; })} />
                      <NumberField label="Icon Y" value={selectedScoreboardRow.iconY} min={-40} max={40} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.iconY = v; })} />
                      <NumberField label="Icon Size" value={selectedScoreboardRow.iconSize} min={24} max={120} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.iconSize = v; })} />
                      <NumberField label="Label X" value={selectedScoreboardRow.labelX} min={50} max={220} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.labelX = v; })} />
                      <NumberField label="Label Size" value={selectedScoreboardRow.labelTextSize} min={24} max={90} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.labelTextSize = v; })} />
                      <NumberField label="Value Size" value={selectedScoreboardRow.valueTextSize} min={24} max={96} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.valueTextSize = v; })} />
                      <NumberField label="Text Y" value={selectedScoreboardRow.textY} min={-30} max={30} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.textY = v; })} />
                      {selectedScoreboardRow.icon === "coin" && (
                        <>
                          <NumberField label="$$ Size" value={selectedScoreboardRow.coinDollarFontSize} min={16} max={58} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.coinDollarFontSize = v; })} />
                          <NumberField label="$$ Width" value={selectedScoreboardRow.coinDollarTextLength} min={24} max={76} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.coinDollarTextLength = v; })} />
                          <NumberField label="$$ Y" value={selectedScoreboardRow.coinDollarY} min={-12} max={24} step={1} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.coinDollarY = v; })} />
                          <NumberField label="$$ Stroke" value={selectedScoreboardRow.coinDollarStrokeWidth} min={0} max={6} step={0.2} onChange={(v) => updateScoreboardRow(selectedScoreboardRow.id, (row) => { row.coinDollarStrokeWidth = v; })} />
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.78rem' }}>
                      Add or select a scoreboard row to edit its icon, copy, and value binding.
                    </div>
                  )}
                </Section>
                <Section title="Table Shape">
                  <NumberField label="Table Margin" value={scoreboard.tableMargin} min={0} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.tableMargin = v; })} onReset={() => updateScoreboard((next) => { next.tableMargin = DEFAULT_SCOREBOARD_CONTROLS.tableMargin; })} />
                  <NumberField label="Divider %" value={scoreboard.tableDividerPercent} min={20} max={80} step={1} onChange={(v) => updateScoreboard((next) => { next.tableDividerPercent = v; })} onReset={() => updateScoreboard((next) => { next.tableDividerPercent = DEFAULT_SCOREBOARD_CONTROLS.tableDividerPercent; })} />
                  <NumberField label="Divider X" value={scoreboard.tableDividerOffset} min={-180} max={180} step={1} onChange={(v) => updateScoreboard((next) => { next.tableDividerOffset = v; })} onReset={() => updateScoreboard((next) => { next.tableDividerOffset = DEFAULT_SCOREBOARD_CONTROLS.tableDividerOffset; })} />
                  <NumberField label="Cell Radius" value={scoreboard.cellCornerRadius} min={0} max={30} step={1} onChange={(v) => updateScoreboard((next) => { next.cellCornerRadius = v; })} onReset={() => updateScoreboard((next) => { next.cellCornerRadius = DEFAULT_SCOREBOARD_CONTROLS.cellCornerRadius; })} />
                  <NumberField label="Row Stroke" value={scoreboard.rowStrokeWidth} min={0} max={10} step={0.5} onChange={(v) => updateScoreboard((next) => { next.rowStrokeWidth = v; })} onReset={() => updateScoreboard((next) => { next.rowStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.rowStrokeWidth; })} />
                  <NumberField label="Bevel Opacity" value={scoreboard.bevelOpacity} min={0} max={1} step={0.01} onChange={(v) => updateScoreboard((next) => { next.bevelOpacity = v; })} onReset={() => updateScoreboard((next) => { next.bevelOpacity = DEFAULT_SCOREBOARD_CONTROLS.bevelOpacity; })} />
                  <ColorField label="Panel Top" value={scoreboard.panelTop} onChange={(v) => updateScoreboard((next) => { next.panelTop = v; })} onReset={() => updateScoreboard((next) => { next.panelTop = DEFAULT_SCOREBOARD_CONTROLS.panelTop; })} />
                  <ColorField label="Panel Bottom" value={scoreboard.panelBottom} onChange={(v) => updateScoreboard((next) => { next.panelBottom = v; })} onReset={() => updateScoreboard((next) => { next.panelBottom = DEFAULT_SCOREBOARD_CONTROLS.panelBottom; })} />
                  <ColorField label="Dark Stroke" value={scoreboard.darkStroke} onChange={(v) => updateScoreboard((next) => { next.darkStroke = v; })} onReset={() => updateScoreboard((next) => { next.darkStroke = DEFAULT_SCOREBOARD_CONTROLS.darkStroke; })} />
                </Section>
                <Section title="Table Text and Colors">
                  <CheckboxField label="Show Icons" value={scoreboard.showIcons} onChange={(value) => updateScoreboard((next) => { next.showIcons = value; })} />
                  <ColorField label="Red Text" value={scoreboard.textRed} onChange={(v) => updateScoreboard((next) => { next.textRed = v; })} onReset={() => updateScoreboard((next) => { next.textRed = DEFAULT_SCOREBOARD_CONTROLS.textRed; })} />
                  <ColorField label="Red Stroke" value={scoreboard.textRedStroke} onChange={(v) => updateScoreboard((next) => { next.textRedStroke = v; })} onReset={() => updateScoreboard((next) => { next.textRedStroke = DEFAULT_SCOREBOARD_CONTROLS.textRedStroke; })} />
                  <ColorField label="Icon Yellow" value={scoreboard.textYellow} onChange={(v) => updateScoreboard((next) => { next.textYellow = v; })} onReset={() => updateScoreboard((next) => { next.textYellow = DEFAULT_SCOREBOARD_CONTROLS.textYellow; })} />
                </Section>
                <Section title="Row Defaults">
                  <NumberField label="Icon X" value={scoreboard.iconX} min={20} max={140} step={1} onChange={(v) => updateScoreboard((next) => { next.iconX = v; })} onReset={() => updateScoreboard((next) => { next.iconX = DEFAULT_SCOREBOARD_CONTROLS.iconX; })} />
                  <NumberField label="Icon Y" value={scoreboard.iconOffsetY} min={-40} max={40} step={1} onChange={(v) => updateScoreboard((next) => { next.iconOffsetY = v; })} onReset={() => updateScoreboard((next) => { next.iconOffsetY = DEFAULT_SCOREBOARD_CONTROLS.iconOffsetY; })} />
                  <NumberField label="Icon Size" value={scoreboard.iconSize} min={24} max={120} step={1} onChange={(v) => updateScoreboard((next) => { next.iconSize = v; })} onReset={() => updateScoreboard((next) => { next.iconSize = DEFAULT_SCOREBOARD_CONTROLS.iconSize; })} />
                  <NumberField label="Label X" value={scoreboard.labelOffsetX} min={50} max={220} step={1} onChange={(v) => updateScoreboard((next) => { next.labelOffsetX = v; })} onReset={() => updateScoreboard((next) => { next.labelOffsetX = DEFAULT_SCOREBOARD_CONTROLS.labelOffsetX; })} />
                  <NumberField label="Label Size" value={scoreboard.labelTextSize} min={24} max={90} step={1} onChange={(v) => updateScoreboard((next) => { next.labelTextSize = v; })} onReset={() => updateScoreboard((next) => { next.labelTextSize = DEFAULT_SCOREBOARD_CONTROLS.labelTextSize; })} />
                  <NumberField label="Value Size" value={scoreboard.valueTextSize} min={24} max={96} step={1} onChange={(v) => updateScoreboard((next) => { next.valueTextSize = v; })} onReset={() => updateScoreboard((next) => { next.valueTextSize = DEFAULT_SCOREBOARD_CONTROLS.valueTextSize; })} />
                  <NumberField label="Text Y" value={scoreboard.rowTextYOffset} min={-30} max={30} step={1} onChange={(v) => updateScoreboard((next) => { next.rowTextYOffset = v; })} onReset={() => updateScoreboard((next) => { next.rowTextYOffset = DEFAULT_SCOREBOARD_CONTROLS.rowTextYOffset; })} />
                  <NumberField label="Cell Pad X" value={scoreboard.cellPaddingX} min={0} max={60} step={1} onChange={(v) => updateScoreboard((next) => { next.cellPaddingX = v; })} onReset={() => updateScoreboard((next) => { next.cellPaddingX = DEFAULT_SCOREBOARD_CONTROLS.cellPaddingX; })} />
                  <NumberField label="$$ Size" value={scoreboard.coinDollarFontSize} min={16} max={58} step={1} onChange={(v) => updateScoreboard((next) => { next.coinDollarFontSize = v; })} onReset={() => updateScoreboard((next) => { next.coinDollarFontSize = DEFAULT_SCOREBOARD_CONTROLS.coinDollarFontSize; })} />
                  <NumberField label="$$ Width" value={scoreboard.coinDollarTextLength} min={24} max={76} step={1} onChange={(v) => updateScoreboard((next) => { next.coinDollarTextLength = v; })} onReset={() => updateScoreboard((next) => { next.coinDollarTextLength = DEFAULT_SCOREBOARD_CONTROLS.coinDollarTextLength; })} />
                  <NumberField label="$$ Y" value={scoreboard.coinDollarY} min={-12} max={24} step={1} onChange={(v) => updateScoreboard((next) => { next.coinDollarY = v; })} onReset={() => updateScoreboard((next) => { next.coinDollarY = DEFAULT_SCOREBOARD_CONTROLS.coinDollarY; })} />
                  <NumberField label="$$ Stroke" value={scoreboard.coinDollarStrokeWidth} min={0} max={6} step={0.2} onChange={(v) => updateScoreboard((next) => { next.coinDollarStrokeWidth = v; })} onReset={() => updateScoreboard((next) => { next.coinDollarStrokeWidth = DEFAULT_SCOREBOARD_CONTROLS.coinDollarStrokeWidth; })} />
                </Section>
              </>
            )}
          </div>
        )}
        {workspaceSection === "cardStrip" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy Card Strip Bundle", onClick: copyCardStripBundle },
                { label: "Reset Card Strip Bundle", onClick: () => confirmBundleReset("card strip bundle", resetCardStripBundle), tone: "danger" },
              ]}
            />
            <div className="game-screen__hud-button-modal-tabs">
              {CARD_STRIP_SECTIONS.map((tab) => (
                <TabButton
                  key={tab.key}
                  compact
                  active={activeCardStripSection === tab.key}
                  onClick={() => setActiveCardStripSection(tab.key)}
                >
                  {tab.label}
                </TabButton>
              ))}
            </div>

            {activeCardStripSection === "layout" && (
              <>
                <Section title="Bounds">
                  <CheckboxField label="Card Strip Root" value={resolvedEditorOverlayVisibility.cardStrip} onChange={(value) => updateEditorOverlayVisibility((next) => { next.cardStrip = value; })} />
                  <CheckboxField label="Slot Bounds" value={resolvedEditorOverlayVisibility.cardStripSlots} onChange={(value) => updateEditorOverlayVisibility((next) => { next.cardStripSlots = value; })} />
                </Section>
                <Section title="Placement & Scale">
                  <ActionBar
                    actions={[
                      { label: "Copy Layout", onClick: copyCardStripBundle },
                      { label: "Reset Layout", onClick: () => confirmBundleReset("card strip layout", resetCardStripBundle), tone: "danger" },
                    ]}
                  />
                  <CheckboxField label="Show Card Strip" value={renderToggles.cardStrip} onChange={(value) => updateRenderToggles((next) => { next.cardStrip = value; })} />
                  <NumberField label="Overall Scale" value={cardStrip.overallScale} min={0.2} max={2} step={0.01} onChange={(v) => updateCardStrip((next) => { next.overallScale = v; })} onReset={() => updateCardStrip((next) => { next.overallScale = DEFAULT_CARD_STRIP_CONTROLS.overallScale; })} />
                  <SelectField
                    label="Fit Mode"
                    value={(cardStripStageBlock ?? DEFAULT_CARD_STRIP_STAGE_BLOCK).fitMode}
                    options={STAGE_FIT_OPTIONS}
                    onChange={(value) => updateCardStripStageBlock((block) => { block.fitMode = value as CardGameStageFitMode; })}
                  />
                  <SelectField
                    label="Anchor X"
                    value={(cardStripStageBlock ?? DEFAULT_CARD_STRIP_STAGE_BLOCK).anchorX}
                    options={STAGE_ANCHOR_X_OPTIONS}
                    onChange={(value) => updateCardStripStageBlock((block) => { block.anchorX = value as "start" | "center" | "end"; })}
                  />
                  <SelectField
                    label="Anchor Y"
                    value={(cardStripStageBlock ?? DEFAULT_CARD_STRIP_STAGE_BLOCK).anchorY}
                    options={STAGE_ANCHOR_Y_OPTIONS}
                    onChange={(value) => updateCardStripStageBlock((block) => { block.anchorY = value as "start" | "center" | "end"; })}
                  />
                </Section>
                <Section title="Card Layout">
                  <NumberField label="Card Width" value={cardStrip.cardWidth} min={64} max={320} step={1} onChange={(v) => updateCardStrip((next) => { next.cardWidth = v; })} onReset={() => updateCardStrip((next) => { next.cardWidth = DEFAULT_CARD_STRIP_CONTROLS.cardWidth; })} />
                  <NumberField label="Card Height" value={cardStrip.cardHeight} min={96} max={420} step={1} onChange={(v) => updateCardStrip((next) => { next.cardHeight = v; })} onReset={() => updateCardStrip((next) => { next.cardHeight = DEFAULT_CARD_STRIP_CONTROLS.cardHeight; })} />
                  <NumberField label="Gap" value={cardStrip.gap} min={0} max={80} step={1} onChange={(v) => updateCardStrip((next) => { next.gap = v; })} onReset={() => updateCardStrip((next) => { next.gap = DEFAULT_CARD_STRIP_CONTROLS.gap; })} />
                </Section>
              </>
            )}

            {activeCardStripSection === "slots" && (
              <>
                <Section title="Slots">
                  <ActionBar
                    actions={[
                      { label: "Copy Slots", onClick: () => copyJson({ slots: cardStrip.slots }) },
                      {
                        label: "Reset Slots",
                        onClick: () => confirmBundleReset("card strip slots", () => {
                          updateCardStrip((next) => {
                            next.slots = cloneCardStripSlots(DEFAULT_CARD_STRIP_CONTROLS.slots ?? []);
                          });
                          setSelectedCardStripSlotId(null);
                        }),
                        tone: "danger",
                      },
                    ]}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {cardStrip.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`game-screen__hud-button-modal-tab ${selectedCardStripSlot?.id === slot.id ? "game-screen__hud-button-modal-tab--active" : ""}`}
                        onClick={() => setSelectedCardStripSlotId(slot.id)}
                      >
                        {slot.label || slot.id}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <button
                      type="button"
                      className="game-screen__hud-button-modal-tab"
                      onClick={() => updateCardStrip((next) => {
                        const slot = createCardStripSlotDefaults(next.slots.length);
                        next.slots.push(slot);
                        setSelectedCardStripSlotId(slot.id);
                      })}
                    >
                      Add Slot
                    </button>
                    {selectedCardStripSlot ? (
                      <button
                        type="button"
                        className="game-screen__hud-button-modal-tab"
                        onClick={() => {
                          const slotId = selectedCardStripSlot.id;
                          updateCardStrip((next) => {
                            next.slots = next.slots.filter((slot) => slot.id !== slotId);
                          });
                          setSelectedCardStripSlotId(null);
                        }}
                      >
                        Remove Selected
                      </button>
                    ) : null}
                  </div>
                  {selectedCardStripSlot ? (
                    <>
                      <TextField label="Slot ID" value={selectedCardStripSlot.id} onChange={(value) => updateCardStripSlot(selectedCardStripSlot.id, (slot) => { slot.id = value; })} />
                      <TextField label="Label" value={selectedCardStripSlot.label} onChange={(value) => updateCardStripSlot(selectedCardStripSlot.id, (slot) => { slot.label = value; })} />
                      <TextField label="Binding" value={selectedCardStripSlot.binding ?? ""} onChange={(value) => updateCardStripSlot(selectedCardStripSlot.id, (slot) => { slot.binding = value || undefined; })} />
                      <CheckboxField label="Preview Face" value={selectedCardStripSlot.previewFaceUp === true} onChange={(value) => updateCardStripSlot(selectedCardStripSlot.id, (slot) => { slot.previewFaceUp = value; })} />
                      <TextField label="Preview Text" value={selectedCardStripSlot.previewText ?? ""} onChange={(value) => updateCardStripSlot(selectedCardStripSlot.id, (slot) => { slot.previewText = value; })} />
                    </>
                  ) : (
                    <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.78rem' }}>
                      Add or select a card strip slot to edit its label, binding, and preview state.
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        )}
        {workspaceSection === "deckTray" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy Deck + Tray Prefab", onClick: copyDeckTrayBundle },
                { label: "Reset Deck + Tray Prefab", onClick: () => confirmBundleReset("deck and tray prefab", resetDeckTrayBundle), tone: "danger" },
              ]}
            />
            <Section title="Runtime and Bounds">
              <CheckboxField label="Show Deck Tray" value={renderToggles.deckTray} onChange={(value) => updateRenderToggles((next) => { next.deckTray = value; })} />
              <CheckboxField label="Tray Unit Bounds" value={resolvedEditorOverlayVisibility.deckTray} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTray = value; })} />
              <CheckboxField label="Deck Stack Bounds" value={resolvedEditorOverlayVisibility.deckTrayDeck} onChange={(value) => updateEditorOverlayVisibility((next) => { next.deckTrayDeck = value; })} />
              <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                Tray Unit Bounds is the full prefab box on the table. Deck Stack Bounds is the deck sitting inside that tray.
              </div>
            </Section>
            <div className="game-screen__hud-button-modal-tabs">
              {DECK_TRAY_SECTIONS.map((tab) => (
                <TabButton
                  key={tab.key}
                  compact
                  active={activeDeckTraySection === tab.key}
                  onClick={() => setActiveDeckTraySection(tab.key)}
                >
                  {tab.label}
                </TabButton>
              ))}
            </div>

            {activeDeckTraySection === "deck" && (
              <>
                <Section title="Canvas">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Deck",
                        onClick: () => copyJson({
                          svgWidth: deckTray.svgWidth,
                          svgHeight: deckTray.svgHeight,
                          glowMargin: deckTray.glowMargin,
                          showDeck: deckTray.showDeck,
                          autoCenterDeck: deckTray.autoCenterDeck,
                          autoScaleDeckToTray: deckTray.autoScaleDeckToTray,
                          deckFitPaddingX: deckTray.deckFitPaddingX,
                          deckFitPaddingY: deckTray.deckFitPaddingY,
                          deckScale: deckTray.deckScale,
                          deckCenterOffsetX: deckTray.deckCenterOffsetX,
                          deckCenterOffsetY: deckTray.deckCenterOffsetY,
                          deckOffsetX: deckTray.deckOffsetX,
                          deckOffsetY: deckTray.deckOffsetY,
                          deckX: deckTray.deckX,
                          deckY: deckTray.deckY,
                          cardWidth: deckTray.cardWidth,
                          cardHeight: deckTray.cardHeight,
                          cardRadius: deckTray.cardRadius,
                          stackCount: deckTray.stackCount,
                          maxStackCount: deckTray.maxStackCount,
                          stackRemoveFromTop: deckTray.stackRemoveFromTop,
                          stackOffsetX: deckTray.stackOffsetX,
                          stackOffsetY: deckTray.stackOffsetY,
                          stackStrokeWidth: deckTray.stackStrokeWidth,
                          stackShadowOpacity: deckTray.stackShadowOpacity,
                        }),
                      },
                      {
                        label: "Reset Deck",
                        onClick: () => confirmBundleReset("deck controls", () => updateDeckTray((next) => {
                          next.svgWidth = DEFAULT_DECK_TRAY_CONTROLS.svgWidth;
                          next.svgHeight = DEFAULT_DECK_TRAY_CONTROLS.svgHeight;
                          next.glowMargin = DEFAULT_DECK_TRAY_CONTROLS.glowMargin;
                          next.showDeck = DEFAULT_DECK_TRAY_CONTROLS.showDeck;
                          next.autoCenterDeck = DEFAULT_DECK_TRAY_CONTROLS.autoCenterDeck;
                          next.autoScaleDeckToTray = DEFAULT_DECK_TRAY_CONTROLS.autoScaleDeckToTray;
                          next.deckFitPaddingX = DEFAULT_DECK_TRAY_CONTROLS.deckFitPaddingX;
                          next.deckFitPaddingY = DEFAULT_DECK_TRAY_CONTROLS.deckFitPaddingY;
                          next.deckScale = DEFAULT_DECK_TRAY_CONTROLS.deckScale;
                          next.deckCenterOffsetX = DEFAULT_DECK_TRAY_CONTROLS.deckCenterOffsetX;
                          next.deckCenterOffsetY = DEFAULT_DECK_TRAY_CONTROLS.deckCenterOffsetY;
                          next.deckOffsetX = DEFAULT_DECK_TRAY_CONTROLS.deckOffsetX;
                          next.deckOffsetY = DEFAULT_DECK_TRAY_CONTROLS.deckOffsetY;
                          next.deckX = DEFAULT_DECK_TRAY_CONTROLS.deckX;
                          next.deckY = DEFAULT_DECK_TRAY_CONTROLS.deckY;
                          next.cardWidth = DEFAULT_DECK_TRAY_CONTROLS.cardWidth;
                          next.cardHeight = DEFAULT_DECK_TRAY_CONTROLS.cardHeight;
                          next.cardRadius = DEFAULT_DECK_TRAY_CONTROLS.cardRadius;
                          next.stackCount = DEFAULT_DECK_TRAY_CONTROLS.stackCount;
                          next.maxStackCount = DEFAULT_DECK_TRAY_CONTROLS.maxStackCount;
                          next.stackRemoveFromTop = DEFAULT_DECK_TRAY_CONTROLS.stackRemoveFromTop;
                          next.stackOffsetX = DEFAULT_DECK_TRAY_CONTROLS.stackOffsetX;
                          next.stackOffsetY = DEFAULT_DECK_TRAY_CONTROLS.stackOffsetY;
                          next.stackStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.stackStrokeWidth;
                          next.stackShadowOpacity = DEFAULT_DECK_TRAY_CONTROLS.stackShadowOpacity;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <NumberField label="SVG W" value={deckTray.svgWidth} min={120} max={520} step={1} onChange={(v) => updateDeckTray((next) => { next.svgWidth = v; })} onReset={() => updateDeckTray((next) => { next.svgWidth = DEFAULT_DECK_TRAY_CONTROLS.svgWidth; })} />
                  <NumberField label="SVG H" value={deckTray.svgHeight} min={180} max={720} step={1} onChange={(v) => updateDeckTray((next) => { next.svgHeight = v; })} onReset={() => updateDeckTray((next) => { next.svgHeight = DEFAULT_DECK_TRAY_CONTROLS.svgHeight; })} />
                  <NumberField label="Glow Margin" value={deckTray.glowMargin} min={0} max={80} step={1} onChange={(v) => updateDeckTray((next) => { next.glowMargin = v; })} onReset={() => updateDeckTray((next) => { next.glowMargin = DEFAULT_DECK_TRAY_CONTROLS.glowMargin; })} />
                </Section>
                <Section title="Deck Position and Size">
                  <CheckboxField label="Show Deck" value={deckTray.showDeck} onChange={(value) => updateDeckTray((next) => { next.showDeck = value; })} />
                  <CheckboxField label="Auto Center" value={deckTray.autoCenterDeck} onChange={(value) => updateDeckTray((next) => { next.autoCenterDeck = value; })} />
                  <CheckboxField label="Auto Scale" value={deckTray.autoScaleDeckToTray} onChange={(value) => updateDeckTray((next) => { next.autoScaleDeckToTray = value; })} />
                  <NumberField label="Fit Pad X" value={deckTray.deckFitPaddingX} min={0} max={80} step={1} onChange={(v) => updateDeckTray((next) => { next.deckFitPaddingX = v; })} onReset={() => updateDeckTray((next) => { next.deckFitPaddingX = DEFAULT_DECK_TRAY_CONTROLS.deckFitPaddingX; })} />
                  <NumberField label="Fit Pad Y" value={deckTray.deckFitPaddingY} min={0} max={120} step={1} onChange={(v) => updateDeckTray((next) => { next.deckFitPaddingY = v; })} onReset={() => updateDeckTray((next) => { next.deckFitPaddingY = DEFAULT_DECK_TRAY_CONTROLS.deckFitPaddingY; })} />
                  <NumberField label="Deck Scale" value={deckTray.deckScale} min={0.2} max={2} step={0.01} onChange={(v) => updateDeckTray((next) => { next.deckScale = v; })} onReset={() => updateDeckTray((next) => { next.deckScale = DEFAULT_DECK_TRAY_CONTROLS.deckScale; })} />
                  <NumberField label="Center X" value={deckTray.deckCenterOffsetX} min={-120} max={120} step={1} onChange={(v) => updateDeckTray((next) => { next.deckCenterOffsetX = v; })} onReset={() => updateDeckTray((next) => { next.deckCenterOffsetX = DEFAULT_DECK_TRAY_CONTROLS.deckCenterOffsetX; })} />
                  <NumberField label="Center Y" value={deckTray.deckCenterOffsetY} min={-180} max={180} step={1} onChange={(v) => updateDeckTray((next) => { next.deckCenterOffsetY = v; })} onReset={() => updateDeckTray((next) => { next.deckCenterOffsetY = DEFAULT_DECK_TRAY_CONTROLS.deckCenterOffsetY; })} />
                  <NumberField label="Move X" value={deckTray.deckOffsetX} min={-180} max={180} step={1} onChange={(v) => updateDeckTray((next) => { next.deckOffsetX = v; })} onReset={() => updateDeckTray((next) => { next.deckOffsetX = DEFAULT_DECK_TRAY_CONTROLS.deckOffsetX; })} />
                  <NumberField label="Move Y" value={deckTray.deckOffsetY} min={-220} max={220} step={1} onChange={(v) => updateDeckTray((next) => { next.deckOffsetY = v; })} onReset={() => updateDeckTray((next) => { next.deckOffsetY = DEFAULT_DECK_TRAY_CONTROLS.deckOffsetY; })} />
                  {!deckTray.autoCenterDeck ? (
                    <>
                      <NumberField label="Deck X" value={deckTray.deckX} min={-80} max={320} step={1} onChange={(v) => updateDeckTray((next) => { next.deckX = v; })} onReset={() => updateDeckTray((next) => { next.deckX = DEFAULT_DECK_TRAY_CONTROLS.deckX; })} />
                      <NumberField label="Deck Y" value={deckTray.deckY} min={-80} max={520} step={1} onChange={(v) => updateDeckTray((next) => { next.deckY = v; })} onReset={() => updateDeckTray((next) => { next.deckY = DEFAULT_DECK_TRAY_CONTROLS.deckY; })} />
                    </>
                  ) : (
                    <div style={{ color: 'rgba(220,255,230,0.45)', fontSize: '0.78rem' }}>
                      Deck X and Deck Y are ignored while Auto Center is on.
                    </div>
                  )}
                  <NumberField label="Card W" value={deckTray.cardWidth} min={40} max={320} step={1} onChange={(v) => updateDeckTray((next) => { next.cardWidth = v; })} onReset={() => updateDeckTray((next) => { next.cardWidth = DEFAULT_DECK_TRAY_CONTROLS.cardWidth; })} />
                  <NumberField label="Card H" value={deckTray.cardHeight} min={60} max={460} step={1} onChange={(v) => updateDeckTray((next) => { next.cardHeight = v; })} onReset={() => updateDeckTray((next) => { next.cardHeight = DEFAULT_DECK_TRAY_CONTROLS.cardHeight; })} />
                  <NumberField label="Card Radius" value={deckTray.cardRadius} min={0} max={40} step={1} onChange={(v) => updateDeckTray((next) => { next.cardRadius = v; })} onReset={() => updateDeckTray((next) => { next.cardRadius = DEFAULT_DECK_TRAY_CONTROLS.cardRadius; })} />
                </Section>
                <Section title="Stack">
                  <NumberField label="Stack Count" value={deckTray.stackCount} min={0} max={18} step={1} onChange={(v) => updateDeckTray((next) => { next.stackCount = v; })} onReset={() => updateDeckTray((next) => { next.stackCount = DEFAULT_DECK_TRAY_CONTROLS.stackCount; })} />
                  <NumberField label="Max Stack" value={deckTray.maxStackCount} min={1} max={30} step={1} onChange={(v) => updateDeckTray((next) => { next.maxStackCount = v; })} onReset={() => updateDeckTray((next) => { next.maxStackCount = DEFAULT_DECK_TRAY_CONTROLS.maxStackCount; })} />
                  <CheckboxField label="Trim Top" value={deckTray.stackRemoveFromTop} onChange={(value) => updateDeckTray((next) => { next.stackRemoveFromTop = value; })} />
                  <NumberField label="Offset X" value={deckTray.stackOffsetX} min={-12} max={12} step={0.5} onChange={(v) => updateDeckTray((next) => { next.stackOffsetX = v; })} onReset={() => updateDeckTray((next) => { next.stackOffsetX = DEFAULT_DECK_TRAY_CONTROLS.stackOffsetX; })} />
                  <NumberField label="Offset Y" value={deckTray.stackOffsetY} min={-12} max={12} step={0.5} onChange={(v) => updateDeckTray((next) => { next.stackOffsetY = v; })} onReset={() => updateDeckTray((next) => { next.stackOffsetY = DEFAULT_DECK_TRAY_CONTROLS.stackOffsetY; })} />
                  <NumberField label="Stack Stroke" value={deckTray.stackStrokeWidth} min={0} max={10} step={0.5} onChange={(v) => updateDeckTray((next) => { next.stackStrokeWidth = v; })} onReset={() => updateDeckTray((next) => { next.stackStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.stackStrokeWidth; })} />
                  <NumberField label="Stack Shadow" value={deckTray.stackShadowOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.stackShadowOpacity = v; })} onReset={() => updateDeckTray((next) => { next.stackShadowOpacity = DEFAULT_DECK_TRAY_CONTROLS.stackShadowOpacity; })} />
                </Section>
              </>
            )}

            {activeDeckTraySection === "tray" && (
              <>
                <Section title="Tray Dimensions">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Tray",
                        onClick: () => copyJson({
                          trayX: deckTray.trayX,
                          trayY: deckTray.trayY,
                          trayWidth: deckTray.trayWidth,
                          trayHeight: deckTray.trayHeight,
                          trayRadius: deckTray.trayRadius,
                          showEmptyTrayGhost: deckTray.showEmptyTrayGhost,
                          ghostOpacity: deckTray.ghostOpacity,
                          trayStrokeWidth: deckTray.trayStrokeWidth,
                          trayInnerStrokeWidth: deckTray.trayInnerStrokeWidth,
                          trayGlowBlur: deckTray.trayGlowBlur,
                          trayShadowOpacity: deckTray.trayShadowOpacity,
                          trayRimHighlightOpacity: deckTray.trayRimHighlightOpacity,
                          trayInnerHighlightOpacity: deckTray.trayInnerHighlightOpacity,
                          trayVignetteOpacity: deckTray.trayVignetteOpacity,
                          showTrayShine: deckTray.showTrayShine,
                          trayShineOpacity: deckTray.trayShineOpacity,
                          trayShineX: deckTray.trayShineX,
                          trayShineWidth: deckTray.trayShineWidth,
                          trayShineAngle: deckTray.trayShineAngle,
                        }),
                      },
                      {
                        label: "Reset Tray",
                        onClick: () => confirmBundleReset("tray controls", () => updateDeckTray((next) => {
                          next.trayX = DEFAULT_DECK_TRAY_CONTROLS.trayX;
                          next.trayY = DEFAULT_DECK_TRAY_CONTROLS.trayY;
                          next.trayWidth = DEFAULT_DECK_TRAY_CONTROLS.trayWidth;
                          next.trayHeight = DEFAULT_DECK_TRAY_CONTROLS.trayHeight;
                          next.trayRadius = DEFAULT_DECK_TRAY_CONTROLS.trayRadius;
                          next.showEmptyTrayGhost = DEFAULT_DECK_TRAY_CONTROLS.showEmptyTrayGhost;
                          next.ghostOpacity = DEFAULT_DECK_TRAY_CONTROLS.ghostOpacity;
                          next.trayStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.trayStrokeWidth;
                          next.trayInnerStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.trayInnerStrokeWidth;
                          next.trayGlowBlur = DEFAULT_DECK_TRAY_CONTROLS.trayGlowBlur;
                          next.trayShadowOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayShadowOpacity;
                          next.trayRimHighlightOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayRimHighlightOpacity;
                          next.trayInnerHighlightOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayInnerHighlightOpacity;
                          next.trayVignetteOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayVignetteOpacity;
                          next.showTrayShine = DEFAULT_DECK_TRAY_CONTROLS.showTrayShine;
                          next.trayShineOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayShineOpacity;
                          next.trayShineX = DEFAULT_DECK_TRAY_CONTROLS.trayShineX;
                          next.trayShineWidth = DEFAULT_DECK_TRAY_CONTROLS.trayShineWidth;
                          next.trayShineAngle = DEFAULT_DECK_TRAY_CONTROLS.trayShineAngle;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <NumberField label="Tray X" value={deckTray.trayX} min={-80} max={320} step={1} onChange={(v) => updateDeckTray((next) => { next.trayX = v; })} onReset={() => updateDeckTray((next) => { next.trayX = DEFAULT_DECK_TRAY_CONTROLS.trayX; })} />
                  <NumberField label="Tray Y" value={deckTray.trayY} min={-80} max={520} step={1} onChange={(v) => updateDeckTray((next) => { next.trayY = v; })} onReset={() => updateDeckTray((next) => { next.trayY = DEFAULT_DECK_TRAY_CONTROLS.trayY; })} />
                  <NumberField label="Tray W" value={deckTray.trayWidth} min={40} max={360} step={1} onChange={(v) => updateDeckTray((next) => { next.trayWidth = v; })} onReset={() => updateDeckTray((next) => { next.trayWidth = DEFAULT_DECK_TRAY_CONTROLS.trayWidth; })} />
                  <NumberField label="Tray H" value={deckTray.trayHeight} min={80} max={640} step={1} onChange={(v) => updateDeckTray((next) => { next.trayHeight = v; })} onReset={() => updateDeckTray((next) => { next.trayHeight = DEFAULT_DECK_TRAY_CONTROLS.trayHeight; })} />
                  <NumberField label="Tray Radius" value={deckTray.trayRadius} min={0} max={40} step={1} onChange={(v) => updateDeckTray((next) => { next.trayRadius = v; })} onReset={() => updateDeckTray((next) => { next.trayRadius = DEFAULT_DECK_TRAY_CONTROLS.trayRadius; })} />
                  <CheckboxField label="Ghost Card" value={deckTray.showEmptyTrayGhost} onChange={(value) => updateDeckTray((next) => { next.showEmptyTrayGhost = value; })} />
                  <NumberField label="Ghost Opac" value={deckTray.ghostOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.ghostOpacity = v; })} onReset={() => updateDeckTray((next) => { next.ghostOpacity = DEFAULT_DECK_TRAY_CONTROLS.ghostOpacity; })} />
                </Section>
                <Section title="Tray Border and Glow">
                  <NumberField label="Tray Stroke" value={deckTray.trayStrokeWidth} min={0} max={14} step={0.5} onChange={(v) => updateDeckTray((next) => { next.trayStrokeWidth = v; })} onReset={() => updateDeckTray((next) => { next.trayStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.trayStrokeWidth; })} />
                  <NumberField label="Inner Stroke" value={deckTray.trayInnerStrokeWidth} min={0} max={10} step={0.5} onChange={(v) => updateDeckTray((next) => { next.trayInnerStrokeWidth = v; })} onReset={() => updateDeckTray((next) => { next.trayInnerStrokeWidth = DEFAULT_DECK_TRAY_CONTROLS.trayInnerStrokeWidth; })} />
                  <NumberField label="Tray Glow" value={deckTray.trayGlowBlur} min={0} max={24} step={1} onChange={(v) => updateDeckTray((next) => { next.trayGlowBlur = v; })} onReset={() => updateDeckTray((next) => { next.trayGlowBlur = DEFAULT_DECK_TRAY_CONTROLS.trayGlowBlur; })} />
                  <NumberField label="Tray Shadow" value={deckTray.trayShadowOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.trayShadowOpacity = v; })} onReset={() => updateDeckTray((next) => { next.trayShadowOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayShadowOpacity; })} />
                  <NumberField label="Rim Light" value={deckTray.trayRimHighlightOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.trayRimHighlightOpacity = v; })} onReset={() => updateDeckTray((next) => { next.trayRimHighlightOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayRimHighlightOpacity; })} />
                  <NumberField label="Inner Light" value={deckTray.trayInnerHighlightOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.trayInnerHighlightOpacity = v; })} onReset={() => updateDeckTray((next) => { next.trayInnerHighlightOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayInnerHighlightOpacity; })} />
                  <NumberField label="Vignette" value={deckTray.trayVignetteOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.trayVignetteOpacity = v; })} onReset={() => updateDeckTray((next) => { next.trayVignetteOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayVignetteOpacity; })} />
                </Section>
                <Section title="Tray Shine">
                  <CheckboxField label="Show Shine" value={deckTray.showTrayShine} onChange={(value) => updateDeckTray((next) => { next.showTrayShine = value; })} />
                  <NumberField label="Shine Opac" value={deckTray.trayShineOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.trayShineOpacity = v; })} onReset={() => updateDeckTray((next) => { next.trayShineOpacity = DEFAULT_DECK_TRAY_CONTROLS.trayShineOpacity; })} />
                  <NumberField label="Shine X" value={deckTray.trayShineX} min={-80} max={220} step={1} onChange={(v) => updateDeckTray((next) => { next.trayShineX = v; })} onReset={() => updateDeckTray((next) => { next.trayShineX = DEFAULT_DECK_TRAY_CONTROLS.trayShineX; })} />
                  <NumberField label="Shine W" value={deckTray.trayShineWidth} min={8} max={220} step={1} onChange={(v) => updateDeckTray((next) => { next.trayShineWidth = v; })} onReset={() => updateDeckTray((next) => { next.trayShineWidth = DEFAULT_DECK_TRAY_CONTROLS.trayShineWidth; })} />
                  <NumberField label="Shine Angle" value={deckTray.trayShineAngle} min={-60} max={60} step={1} onChange={(v) => updateDeckTray((next) => { next.trayShineAngle = v; })} onReset={() => updateDeckTray((next) => { next.trayShineAngle = DEFAULT_DECK_TRAY_CONTROLS.trayShineAngle; })} />
                </Section>
              </>
            )}

            {activeDeckTraySection === "image" && (
              <>
                <Section title="Top Card Image">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Image",
                        onClick: () => copyJson({
                          topCardImageUrl: deckTray.topCardImageUrl,
                          imageFit: deckTray.imageFit,
                          imageScale: deckTray.imageScale,
                          imageX: deckTray.imageX,
                          imageY: deckTray.imageY,
                          imageOpacity: deckTray.imageOpacity,
                          topCardInset: deckTray.topCardInset,
                          topCardRadius: deckTray.topCardRadius,
                          showPlaceholderText: deckTray.showPlaceholderText,
                          placeholderText: deckTray.placeholderText,
                          placeholderText2: deckTray.placeholderText2,
                          placeholderTextSize: deckTray.placeholderTextSize,
                        }),
                      },
                      {
                        label: "Reset Image",
                        onClick: () => confirmBundleReset("deck tray image", () => updateDeckTray((next) => {
                          next.topCardImageUrl = DEFAULT_DECK_TRAY_CONTROLS.topCardImageUrl;
                          next.imageFit = DEFAULT_DECK_TRAY_CONTROLS.imageFit;
                          next.imageScale = DEFAULT_DECK_TRAY_CONTROLS.imageScale;
                          next.imageX = DEFAULT_DECK_TRAY_CONTROLS.imageX;
                          next.imageY = DEFAULT_DECK_TRAY_CONTROLS.imageY;
                          next.imageOpacity = DEFAULT_DECK_TRAY_CONTROLS.imageOpacity;
                          next.topCardInset = DEFAULT_DECK_TRAY_CONTROLS.topCardInset;
                          next.topCardRadius = DEFAULT_DECK_TRAY_CONTROLS.topCardRadius;
                          next.showPlaceholderText = DEFAULT_DECK_TRAY_CONTROLS.showPlaceholderText;
                          next.placeholderText = DEFAULT_DECK_TRAY_CONTROLS.placeholderText;
                          next.placeholderText2 = DEFAULT_DECK_TRAY_CONTROLS.placeholderText2;
                          next.placeholderTextSize = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextSize;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <TextField label="Image URL" value={deckTray.topCardImageUrl} onChange={(value) => updateDeckTray((next) => { next.topCardImageUrl = value; })} />
                  <SelectField label="Image Fit" value={deckTray.imageFit} options={DECK_TRAY_IMAGE_FIT_OPTIONS} onChange={(value) => updateDeckTray((next) => { next.imageFit = value as CardGameDeckTrayImageFit; })} />
                  <NumberField label="Image Scale" value={deckTray.imageScale} min={0.2} max={3} step={0.01} onChange={(v) => updateDeckTray((next) => { next.imageScale = v; })} onReset={() => updateDeckTray((next) => { next.imageScale = DEFAULT_DECK_TRAY_CONTROLS.imageScale; })} />
                  <NumberField label="Image X" value={deckTray.imageX} min={-180} max={180} step={1} onChange={(v) => updateDeckTray((next) => { next.imageX = v; })} onReset={() => updateDeckTray((next) => { next.imageX = DEFAULT_DECK_TRAY_CONTROLS.imageX; })} />
                  <NumberField label="Image Y" value={deckTray.imageY} min={-260} max={260} step={1} onChange={(v) => updateDeckTray((next) => { next.imageY = v; })} onReset={() => updateDeckTray((next) => { next.imageY = DEFAULT_DECK_TRAY_CONTROLS.imageY; })} />
                  <NumberField label="Image Opac" value={deckTray.imageOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.imageOpacity = v; })} onReset={() => updateDeckTray((next) => { next.imageOpacity = DEFAULT_DECK_TRAY_CONTROLS.imageOpacity; })} />
                </Section>
                <Section title="Top Card Inner Area">
                  <NumberField label="Card Inset" value={deckTray.topCardInset} min={0} max={32} step={1} onChange={(v) => updateDeckTray((next) => { next.topCardInset = v; })} onReset={() => updateDeckTray((next) => { next.topCardInset = DEFAULT_DECK_TRAY_CONTROLS.topCardInset; })} />
                  <NumberField label="Inner Radius" value={deckTray.topCardRadius} min={0} max={32} step={1} onChange={(v) => updateDeckTray((next) => { next.topCardRadius = v; })} onReset={() => updateDeckTray((next) => { next.topCardRadius = DEFAULT_DECK_TRAY_CONTROLS.topCardRadius; })} />
                </Section>
                <Section title="Placeholder Text">
                  <CheckboxField label="Show Text" value={deckTray.showPlaceholderText} onChange={(value) => updateDeckTray((next) => { next.showPlaceholderText = value; })} />
                  <TextField label="Text 1" value={deckTray.placeholderText} onChange={(value) => updateDeckTray((next) => { next.placeholderText = value; })} />
                  <TextField label="Text 2" value={deckTray.placeholderText2} onChange={(value) => updateDeckTray((next) => { next.placeholderText2 = value; })} />
                  <NumberField label="Text Size" value={deckTray.placeholderTextSize} min={8} max={60} step={1} onChange={(v) => updateDeckTray((next) => { next.placeholderTextSize = v; })} onReset={() => updateDeckTray((next) => { next.placeholderTextSize = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextSize; })} />
                </Section>
              </>
            )}

            {activeDeckTraySection === "style" && (
              <>
                <Section title="Tray Colors">
                  <ActionBar
                    actions={[
                      {
                        label: "Copy Style",
                        onClick: () => copyJson({
                          trayFillTop: deckTray.trayFillTop,
                          trayFillBottom: deckTray.trayFillBottom,
                          trayStroke: deckTray.trayStroke,
                          trayInnerStroke: deckTray.trayInnerStroke,
                          trayGlowColor: deckTray.trayGlowColor,
                          trayRimHighlight: deckTray.trayRimHighlight,
                          stackFill: deckTray.stackFill,
                          stackStroke: deckTray.stackStroke,
                          showPattern: deckTray.showPattern,
                          patternOpacity: deckTray.patternOpacity,
                          patternStroke: deckTray.patternStroke,
                          placeholderTop: deckTray.placeholderTop,
                          placeholderBottom: deckTray.placeholderBottom,
                          placeholderTextColor: deckTray.placeholderTextColor,
                          placeholderTextStroke: deckTray.placeholderTextStroke,
                        }),
                      },
                      {
                        label: "Reset Style",
                        onClick: () => confirmBundleReset("deck tray style", () => updateDeckTray((next) => {
                          next.trayFillTop = DEFAULT_DECK_TRAY_CONTROLS.trayFillTop;
                          next.trayFillBottom = DEFAULT_DECK_TRAY_CONTROLS.trayFillBottom;
                          next.trayStroke = DEFAULT_DECK_TRAY_CONTROLS.trayStroke;
                          next.trayInnerStroke = DEFAULT_DECK_TRAY_CONTROLS.trayInnerStroke;
                          next.trayGlowColor = DEFAULT_DECK_TRAY_CONTROLS.trayGlowColor;
                          next.trayRimHighlight = DEFAULT_DECK_TRAY_CONTROLS.trayRimHighlight;
                          next.stackFill = DEFAULT_DECK_TRAY_CONTROLS.stackFill;
                          next.stackStroke = DEFAULT_DECK_TRAY_CONTROLS.stackStroke;
                          next.showPattern = DEFAULT_DECK_TRAY_CONTROLS.showPattern;
                          next.patternOpacity = DEFAULT_DECK_TRAY_CONTROLS.patternOpacity;
                          next.patternStroke = DEFAULT_DECK_TRAY_CONTROLS.patternStroke;
                          next.placeholderTop = DEFAULT_DECK_TRAY_CONTROLS.placeholderTop;
                          next.placeholderBottom = DEFAULT_DECK_TRAY_CONTROLS.placeholderBottom;
                          next.placeholderTextColor = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextColor;
                          next.placeholderTextStroke = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextStroke;
                        })),
                        tone: "danger",
                      },
                    ]}
                  />
                  <ColorField label="Fill Top" value={deckTray.trayFillTop} onChange={(v) => updateDeckTray((next) => { next.trayFillTop = v; })} onReset={() => updateDeckTray((next) => { next.trayFillTop = DEFAULT_DECK_TRAY_CONTROLS.trayFillTop; })} />
                  <ColorField label="Fill Bottom" value={deckTray.trayFillBottom} onChange={(v) => updateDeckTray((next) => { next.trayFillBottom = v; })} onReset={() => updateDeckTray((next) => { next.trayFillBottom = DEFAULT_DECK_TRAY_CONTROLS.trayFillBottom; })} />
                  <ColorField label="Stroke" value={deckTray.trayStroke} onChange={(v) => updateDeckTray((next) => { next.trayStroke = v; })} onReset={() => updateDeckTray((next) => { next.trayStroke = DEFAULT_DECK_TRAY_CONTROLS.trayStroke; })} />
                  <ColorField label="Inner Stroke" value={deckTray.trayInnerStroke} onChange={(v) => updateDeckTray((next) => { next.trayInnerStroke = v; })} onReset={() => updateDeckTray((next) => { next.trayInnerStroke = DEFAULT_DECK_TRAY_CONTROLS.trayInnerStroke; })} />
                  <ColorField label="Glow" value={deckTray.trayGlowColor} onChange={(v) => updateDeckTray((next) => { next.trayGlowColor = v; })} onReset={() => updateDeckTray((next) => { next.trayGlowColor = DEFAULT_DECK_TRAY_CONTROLS.trayGlowColor; })} />
                  <ColorField label="Rim Light" value={deckTray.trayRimHighlight} onChange={(v) => updateDeckTray((next) => { next.trayRimHighlight = v; })} onReset={() => updateDeckTray((next) => { next.trayRimHighlight = DEFAULT_DECK_TRAY_CONTROLS.trayRimHighlight; })} />
                </Section>
                <Section title="Card Stack Colors">
                  <ColorField label="Stack Fill" value={deckTray.stackFill} onChange={(v) => updateDeckTray((next) => { next.stackFill = v; })} onReset={() => updateDeckTray((next) => { next.stackFill = DEFAULT_DECK_TRAY_CONTROLS.stackFill; })} />
                  <ColorField label="Stack Stroke" value={deckTray.stackStroke} onChange={(v) => updateDeckTray((next) => { next.stackStroke = v; })} onReset={() => updateDeckTray((next) => { next.stackStroke = DEFAULT_DECK_TRAY_CONTROLS.stackStroke; })} />
                </Section>
                <Section title="Placeholder Style">
                  <CheckboxField label="Pattern" value={deckTray.showPattern} onChange={(value) => updateDeckTray((next) => { next.showPattern = value; })} />
                  <NumberField label="Pattern Opac" value={deckTray.patternOpacity} min={0} max={1} step={0.01} onChange={(v) => updateDeckTray((next) => { next.patternOpacity = v; })} onReset={() => updateDeckTray((next) => { next.patternOpacity = DEFAULT_DECK_TRAY_CONTROLS.patternOpacity; })} />
                  <ColorField label="Pattern" value={deckTray.patternStroke} onChange={(v) => updateDeckTray((next) => { next.patternStroke = v; })} onReset={() => updateDeckTray((next) => { next.patternStroke = DEFAULT_DECK_TRAY_CONTROLS.patternStroke; })} />
                  <ColorField label="Top" value={deckTray.placeholderTop} onChange={(v) => updateDeckTray((next) => { next.placeholderTop = v; })} onReset={() => updateDeckTray((next) => { next.placeholderTop = DEFAULT_DECK_TRAY_CONTROLS.placeholderTop; })} />
                  <ColorField label="Bottom" value={deckTray.placeholderBottom} onChange={(v) => updateDeckTray((next) => { next.placeholderBottom = v; })} onReset={() => updateDeckTray((next) => { next.placeholderBottom = DEFAULT_DECK_TRAY_CONTROLS.placeholderBottom; })} />
                  <ColorField label="Text" value={deckTray.placeholderTextColor} onChange={(v) => updateDeckTray((next) => { next.placeholderTextColor = v; })} onReset={() => updateDeckTray((next) => { next.placeholderTextColor = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextColor; })} />
                  <ColorField label="Text Stroke" value={deckTray.placeholderTextStroke} onChange={(v) => updateDeckTray((next) => { next.placeholderTextStroke = v; })} onReset={() => updateDeckTray((next) => { next.placeholderTextStroke = DEFAULT_DECK_TRAY_CONTROLS.placeholderTextStroke; })} />
                </Section>
              </>
            )}
          </div>
        )}
        {workspaceSection === "cardVisuals" && (
          <div className="game-screen__hud-button-modal-content">
            <ActionBar
              actions={[
                { label: "Copy Card Visuals", onClick: copyCardVisualsBundle },
                { label: "Reset Card Visuals", onClick: () => confirmBundleReset("card visuals", resetCardVisualsBundle), tone: "danger" },
              ]}
            />
            <Section title="Bounds">
              <CheckboxField label="Preview Frame" value={resolvedEditorOverlayVisibility.cardVisuals} onChange={(value) => updateEditorOverlayVisibility((next) => { next.cardVisuals = value; })} />
            </Section>
            <Section title="Card Graphics">
              <NumberField
                label="Float Scale"
                value={document.cardVisuals.floatScale}
                min={0.5}
                max={8}
                step={0.1}
                onChange={(value) => updateDoc((draft) => { draft.cardVisuals.floatScale = value; })}
                onReset={() => updateDoc((draft) => { draft.cardVisuals.floatScale = DEFAULT_CARD_VISUAL_CONTROLS.floatScale; })}
              />
            </Section>
            <Section title="Card Frame Preview">
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div style={{ position: 'relative' }}>
                  {resolvedEditorOverlayVisibility.cardVisuals ? (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: '-0.5rem',
                        border: '2px dashed rgba(0, 255, 102, 0.92)',
                        borderRadius: '1rem',
                        boxShadow: '0 0 1rem rgba(0, 255, 102, 0.2)',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}
                  <PlainCardFrame {...(document.cardFrame ?? PLAIN_CARD_FRAME_DEFAULTS)} />
                </div>
              </div>
            </Section>
            <Section title="Frame Geometry">
              <NumberField label="Width" value={document.cardFrame?.width ?? PLAIN_CARD_FRAME_DEFAULTS.width} min={120} max={520} step={1} onChange={(value) => updateCardFrame((frame) => { frame.width = value; })} onReset={() => updateCardFrame((frame) => { frame.width = PLAIN_CARD_FRAME_DEFAULTS.width; })} />
              <NumberField label="Height" value={document.cardFrame?.height ?? PLAIN_CARD_FRAME_DEFAULTS.height} min={180} max={720} step={1} onChange={(value) => updateCardFrame((frame) => { frame.height = value; })} onReset={() => updateCardFrame((frame) => { frame.height = PLAIN_CARD_FRAME_DEFAULTS.height; })} />
              <NumberField label="Corner Radius" value={document.cardFrame?.cornerRadius ?? PLAIN_CARD_FRAME_DEFAULTS.cornerRadius} min={0} max={60} step={1} onChange={(value) => updateCardFrame((frame) => { frame.cornerRadius = value; })} onReset={() => updateCardFrame((frame) => { frame.cornerRadius = PLAIN_CARD_FRAME_DEFAULTS.cornerRadius; })} />
              <NumberField label="Gold Border" value={document.cardFrame?.goldBorderWidth ?? PLAIN_CARD_FRAME_DEFAULTS.goldBorderWidth} min={0} max={24} step={1} onChange={(value) => updateCardFrame((frame) => { frame.goldBorderWidth = value; })} onReset={() => updateCardFrame((frame) => { frame.goldBorderWidth = PLAIN_CARD_FRAME_DEFAULTS.goldBorderWidth; })} />
              <NumberField label="Green Border" value={document.cardFrame?.greenBorderWidth ?? PLAIN_CARD_FRAME_DEFAULTS.greenBorderWidth} min={0} max={32} step={1} onChange={(value) => updateCardFrame((frame) => { frame.greenBorderWidth = value; })} onReset={() => updateCardFrame((frame) => { frame.greenBorderWidth = PLAIN_CARD_FRAME_DEFAULTS.greenBorderWidth; })} />
              <NumberField label="Glow Blur" value={document.cardFrame?.glowBlur ?? PLAIN_CARD_FRAME_DEFAULTS.glowBlur} min={0} max={40} step={1} onChange={(value) => updateCardFrame((frame) => { frame.glowBlur = value; })} onReset={() => updateCardFrame((frame) => { frame.glowBlur = PLAIN_CARD_FRAME_DEFAULTS.glowBlur; })} />
              <NumberField label="Glow Margin" value={document.cardFrame?.glowMargin ?? PLAIN_CARD_FRAME_DEFAULTS.glowMargin} min={0} max={64} step={1} onChange={(value) => updateCardFrame((frame) => { frame.glowMargin = value; })} onReset={() => updateCardFrame((frame) => { frame.glowMargin = PLAIN_CARD_FRAME_DEFAULTS.glowMargin; })} />
            </Section>
            <Section title="Frame Colors">
              <ColorField label="Outer Green" value={document.cardFrame?.outerGreen ?? PLAIN_CARD_FRAME_DEFAULTS.outerGreen} onChange={(value) => updateCardFrame((frame) => { frame.outerGreen = value; })} onReset={() => updateCardFrame((frame) => { frame.outerGreen = PLAIN_CARD_FRAME_DEFAULTS.outerGreen; })} />
              <ColorField label="Gold Light" value={document.cardFrame?.goldLight ?? PLAIN_CARD_FRAME_DEFAULTS.goldLight} onChange={(value) => updateCardFrame((frame) => { frame.goldLight = value; })} onReset={() => updateCardFrame((frame) => { frame.goldLight = PLAIN_CARD_FRAME_DEFAULTS.goldLight; })} />
              <ColorField label="Gold Mid" value={document.cardFrame?.goldMid ?? PLAIN_CARD_FRAME_DEFAULTS.goldMid} onChange={(value) => updateCardFrame((frame) => { frame.goldMid = value; })} onReset={() => updateCardFrame((frame) => { frame.goldMid = PLAIN_CARD_FRAME_DEFAULTS.goldMid; })} />
              <ColorField label="Gold Dark" value={document.cardFrame?.goldDark ?? PLAIN_CARD_FRAME_DEFAULTS.goldDark} onChange={(value) => updateCardFrame((frame) => { frame.goldDark = value; })} onReset={() => updateCardFrame((frame) => { frame.goldDark = PLAIN_CARD_FRAME_DEFAULTS.goldDark; })} />
              <ColorField label="Fill Top" value={document.cardFrame?.fillTop ?? PLAIN_CARD_FRAME_DEFAULTS.fillTop} onChange={(value) => updateCardFrame((frame) => { frame.fillTop = value; })} onReset={() => updateCardFrame((frame) => { frame.fillTop = PLAIN_CARD_FRAME_DEFAULTS.fillTop; })} />
              <ColorField label="Fill Bottom" value={document.cardFrame?.fillBottom ?? PLAIN_CARD_FRAME_DEFAULTS.fillBottom} onChange={(value) => updateCardFrame((frame) => { frame.fillBottom = value; })} onReset={() => updateCardFrame((frame) => { frame.fillBottom = PLAIN_CARD_FRAME_DEFAULTS.fillBottom; })} />
              <CheckboxField label="Inner Shadow" value={document.cardFrame?.showInnerShadow ?? PLAIN_CARD_FRAME_DEFAULTS.showInnerShadow} onChange={(value) => updateCardFrame((frame) => { frame.showInnerShadow = value; })} />
            </Section>
            <Section title="Bottom Title">
              <CheckboxField label="Show Bottom Title" value={document.cardFrame?.showBottomTitle ?? PLAIN_CARD_FRAME_DEFAULTS.showBottomTitle} onChange={(value) => updateCardFrame((frame) => { frame.showBottomTitle = value; })} />
              <TextField label="Title" value={document.cardFrame?.bottomTitle ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitle} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitle = value; })} />
              <NumberField label="Title Height" value={document.cardFrame?.bottomTitleHeight ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleHeight} min={12} max={120} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleHeight = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleHeight = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleHeight; })} />
              <NumberField label="Title Size" value={document.cardFrame?.bottomTitleSize ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleSize} min={8} max={48} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleSize = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleSize = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleSize; })} />
              <NumberField label="Inset X" value={document.cardFrame?.bottomTitleInsetX ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleInsetX} min={0} max={48} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleInsetX = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleInsetX = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleInsetX; })} />
              <NumberField label="Bottom Inset" value={document.cardFrame?.bottomTitleBottomInset ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleBottomInset} min={-24} max={48} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleBottomInset = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleBottomInset = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleBottomInset; })} />
              <NumberField label="Corner Radius" value={document.cardFrame?.bottomTitleCornerRadius ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleCornerRadius} min={0} max={24} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleCornerRadius = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleCornerRadius = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleCornerRadius; })} />
              <NumberField label="Stroke Width" value={document.cardFrame?.bottomTitleStrokeWidth ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleStrokeWidth} min={0} max={8} step={0.5} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleStrokeWidth = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleStrokeWidth = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleStrokeWidth; })} />
              <NumberField label="Title Y Offset" value={document.cardFrame?.bottomTitleYOffset ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleYOffset} min={-20} max={20} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleYOffset = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleYOffset = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleYOffset; })} />
              <NumberField label="Text Padding" value={document.cardFrame?.bottomTitleTextPadding ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleTextPadding} min={0} max={24} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleTextPadding = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleTextPadding = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleTextPadding; })} />
              <NumberField label="Text Y Offset" value={document.cardFrame?.bottomTitleTextYOffset ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleTextYOffset} min={-20} max={20} step={1} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleTextYOffset = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleTextYOffset = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleTextYOffset; })} />
              <ColorField label="Fill Light" value={document.cardFrame?.bottomTitleFillLight ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleFillLight} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleFillLight = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleFillLight = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleFillLight; })} />
              <ColorField label="Fill Dark" value={document.cardFrame?.bottomTitleFillDark ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleFillDark} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleFillDark = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleFillDark = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleFillDark; })} />
              <ColorField label="Text Color" value={document.cardFrame?.bottomTitleText ?? PLAIN_CARD_FRAME_DEFAULTS.bottomTitleText} onChange={(value) => updateCardFrame((frame) => { frame.bottomTitleText = value; })} onReset={() => updateCardFrame((frame) => { frame.bottomTitleText = PLAIN_CARD_FRAME_DEFAULTS.bottomTitleText; })} />
            </Section>
          </div>
        )}
      </main>
    </div>
  );
};

export const PlayerUiInspector: React.FC<{
  config: CardGameLayoutDocument['playerUiDefaults'],
  onChange: (config: CardGameLayoutDocument['playerUiDefaults']) => void
}> = ({ config, onChange }) => {
  const _update = (fn: (cfg: CardGameLayoutDocument['playerUiDefaults']) => void) => {
    const next = JSON.parse(JSON.stringify(config));
    fn(next);
    onChange(next);
  };

  return (
    <div className="game-screen__hud-button-modal-content">
      <Section title="Seat Layout & Scaling">
        <></>
      </Section>
      <Section title="Timer Settings">
        <></>
      </Section>
    </div>
  );
};

export const TableInspector: React.FC<{
  config: CardGameLayoutDocument['presets'][string]['table'],
  onChange: (config: CardGameLayoutDocument['presets'][string]['table']) => void
}> = ({ config, onChange }) => {
  const _update = (fn: (cfg: CardGameLayoutDocument['presets'][string]['table']) => void) => {
    const next = JSON.parse(JSON.stringify(config));
    fn(next);
    onChange(next);
  };

  return (
    <div className="game-screen__hud-button-modal-content">
      <Section title="Table Geometry">
        <></>
      </Section>
    </div>
  );
};

export const HudInspector: React.FC<{
  config: HudArtworkControls,
  onChange: (config: HudArtworkControls) => void
}> = ({ config, onChange }) => {
  const update = (fn: (cfg: HudArtworkControls) => void) => {
    const next = JSON.parse(JSON.stringify(config));
    fn(next);
    onChange(next);
  };

  return (
    <div className="game-screen__hud-button-modal-content">
      <Section title="HUD Artwork">
        <NumberField label="HUD Width" value={config.width} min={400} max={2500} step={1} onChange={(v) => update(c => { c.width = v; })} onReset={() => update(c => { c.width = DEFAULT_HUD_ARTWORK_CONTROLS.width; })} />
        <NumberField label="HUD Height" value={config.height} min={100} max={600} step={1} onChange={(v) => update(c => { c.height = v; })} onReset={() => update(c => { c.height = DEFAULT_HUD_ARTWORK_CONTROLS.height; })} />
        <NumberField label="Overall Scale" value={config.overallScale} min={0.2} max={2.0} step={0.01} onChange={(v) => update(c => { c.overallScale = v; })} onReset={() => update(c => { c.overallScale = DEFAULT_HUD_ARTWORK_CONTROLS.overallScale; })} />
      </Section>
    </div>
  );
};

export const HudButtonInspector: React.FC<{
  config: HudButtonControls,
  onChange: (config: HudButtonControls) => void
}> = (props) => {
  const { config, onChange } = props;
  const update = (fn: (cfg: HudButtonControls) => void) => {
    const next = { ...config };
    fn(next);
    onChange(next);
  };

  return (
    <div className="game-screen__hud-button-modal-content">
      <Section title="Button Geometry">
        <NumberField label="Width" value={config.width} min={50} max={1000} step={1} onChange={(v) => update(c => { c.width = v; })} onReset={() => update(c => { c.width = DEFAULT_HUD_BUTTON_CONTROLS.width; })} />
        <NumberField label="Height" value={config.height} min={20} max={500} step={1} onChange={(v) => update(c => { c.height = v; })} onReset={() => update(c => { c.height = DEFAULT_HUD_BUTTON_CONTROLS.height; })} />
        <NumberField label="Radius" value={config.radius} min={0} max={250} step={1} onChange={(v) => update(c => { c.radius = v; })} onReset={() => update(c => { c.radius = DEFAULT_HUD_BUTTON_CONTROLS.radius; })} />
        <NumberField label="Font Size" value={config.fontSize} min={8} max={72} step={1} onChange={(v) => update(c => { c.fontSize = v; })} onReset={() => update(c => { c.fontSize = DEFAULT_HUD_BUTTON_CONTROLS.fontSize; })} />
      </Section>
      <Section title="Colors">
        <ColorField label="Text Color" value={config.textColor} onChange={(v) => update(c => { c.textColor = v; })} onReset={() => update(c => { c.textColor = DEFAULT_HUD_BUTTON_CONTROLS.textColor; })} />
        <ColorField label="Ring Color" value={config.ringColor} onChange={(v) => update(c => { c.ringColor = v; })} onReset={() => update(c => { c.ringColor = DEFAULT_HUD_BUTTON_CONTROLS.ringColor; })} />
        <ColorField label="Mid Glow" value={config.midGlowColor} onChange={(v) => update(c => { c.midGlowColor = v; })} onReset={() => update(c => { c.midGlowColor = DEFAULT_HUD_BUTTON_CONTROLS.midGlowColor; })} />
      </Section>
    </div>
  );
};
export default CardGameDesignStudio;
