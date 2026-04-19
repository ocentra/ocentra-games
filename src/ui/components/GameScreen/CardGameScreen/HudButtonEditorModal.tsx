import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  DEFAULT_HUD_ARTWORK_CONTROLS,
  type HudArtworkControls,
  type HudButtonControls,
  type HudButtonVariantControls,
} from "./HudArtwork.types";
import { PlayerUIConfig } from "./PlayerUI";
import type { TableShapeSettings } from "@ocentra/game-ui-types/tableLayoutTypes";
import type { TableLayoutState } from "@/ui/layout/tableLayoutTypes";

type NumberFieldKey =
  | "buttonOffsetX"
  | "buttonOffsetY"
  | "width"
  | "height"
  | "radius"
  | "sideInset"
  | "dotInset"
  | "dotGap"
  | "fontSize"
  | "hoverInsetExpand"
  | "hoverClampGlowOpacity"
  | "clickInsetExpand"
  | "clickRingFlashOpacity";

type ColorFieldKey =
  | "textColor"
  | "ringColor"
  | "outerGlowColor"
  | "midGlowColor"
  | "clickRingFlashColor"
  | "dotGlowColor"
  | "dotCoreColor"
  | "sideStroke"
  | "sideGlow"
  | "frontFillTop"
  | "frontFillMid"
  | "frontFillBottom"
  | "hoverClampGlowColor"
  | "bodyCenter"
  | "bodyMid"
  | "bodyEdge";

export type WorkspaceSectionKey = "layerSplit" | "hudTuning" | "hudButtons" | "table" | "cardVisuals" | "cardInHand";
type EditorSectionKey = "layout" | "geometry" | "effects" | "colors";
type HudTuningSectionKey = "overall" | "wings" | "dome" | "style";
type TableSectionKey = "shape" | "seats" | "playerUi";
type LayerKey = "background" | "header" | "table" | "seats" | "cards" | "hud" | "tools" | "footer";
type LayerVisibility = Record<LayerKey, boolean>;
type CardControls = {
  cardCount: number;
  minCardCount: number;
  maxCardCount: number;
  radiusScale: number;
  radiusOffset: number;
  cardWidthScale: number;
  arcMin: number;
  arcMax: number;
  fanTilt: number;
  centerOffsetX: number;
  centerOffsetY: number;
  disableViewportScale: boolean;
};
type CardVisualControls = {
  floatScale: number;
};
type WingField = keyof HudArtworkControls["leftWing"];

type HudButtonEditorModalProps = {
  open: boolean;
  initialWorkspaceSection?: WorkspaceSectionKey;
  activeIndex: number;
  master: HudButtonControls;
  controls: HudArtworkControls;
  buttonScale: number;
  buttonCount: number;
  buttonLabels: string[];
  buttonVariants: HudButtonVariantControls[];
  buttonLayoutCopyState: "idle" | "copied" | "failed";
  showButtonGuides: boolean;
  layerVisibility: LayerVisibility;
  cardControls: CardControls;
  cardVisualControls: CardVisualControls;
  tableLayoutState: TableLayoutState;
  lockWings: boolean;
  onClose: () => void;
  onSelectTab: (index: number) => void;
  onChangeButtonScale: (value: number) => void;
  onChangeButtonCount: (value: number) => void;
  onToggleLayer: (key: LayerKey) => void;
  onResetLayerVisibility: () => void;
  onHideAllLayers: () => void;
  onUpdateHudControls: (updater: (current: HudArtworkControls) => HudArtworkControls) => void;
  onUndoHudControls: () => void;
  onCopyHudControls: () => void;
  onResetHudControls: () => void;
  onToggleWingLock: () => void;
  onSetHudWingControl: (side: "leftWing" | "rightWing", field: WingField, value: number) => void;
  onSetSharedWingControl: (field: WingField, value: number) => void;
  onSetHudClampControl: (field: "width" | "height" | "rightRadius" | "goldTop" | "goldMid" | "goldBottom", value: number | string) => void;
  onSetHudWingStyleControl: (field: "edgeColor" | "edgeWidth" | "glowColor" | "glowWidth" | "glowOpacity", value: number | string) => void;
  onSetHudDomeControl: (field: "cx" | "cy" | "radius" | "edgeColor" | "edgeInnerColor" | "edgeWidth" | "glowColor" | "glowWidth" | "glowOpacity", value: number | string) => void;
  onSetCardControls: (updater: (current: CardControls) => CardControls) => void;
  onResetCardControls: () => void;
  onSetCardVisualControls: (updater: (current: CardVisualControls) => CardVisualControls) => void;
  onResetTablePreset: () => void;
  onSetTableShapeField: (field: keyof TableShapeSettings, value: number | string) => void;
  onSetPlayerCount: (value: number) => void;
  onSetSeatField: (seatId: number, field: "label" | "x" | "y" | "rotation" | "scale", value: number | string) => void;
  onSelectSeat: (seatId: number | null) => void;
  onSetPlayerUiDefaults: (updater: (current: Partial<PlayerUIConfig>) => Partial<PlayerUIConfig>) => void;
  onResetPlayerUiDefaults: () => void;
  onChangeMaster: (field: keyof HudButtonControls, value: number | string) => void;
  onChangeVariant: (index: number, field: keyof HudButtonControls, value: number | string) => void;
  onToggleVariantLink: (index: number, linked: boolean) => void;
  onApplyMasterToAll: () => void;
  onResetButtons: () => void;
  onCopyButtonLayout: () => void;
  onSetLabel: (index: number, value: string) => void;
  onToggleButtonGuides: () => void;
};

const LAYOUT_FIELDS: Array<{ key: NumberFieldKey; label: string; min: number; max: number; step: number }> = [
  { key: "width", label: "Width", min: 180, max: 900, step: 1 },
  { key: "height", label: "Height", min: 60, max: 260, step: 1 },
  { key: "radius", label: "Radius", min: 0, max: 180, step: 1 },
  { key: "sideInset", label: "Side Inset", min: -80, max: 120, step: 1 },
  { key: "dotInset", label: "Dot Inset", min: 0, max: 80, step: 1 },
  { key: "dotGap", label: "Dot Gap", min: 0, max: 40, step: 1 },
  { key: "fontSize", label: "Font Size", min: 8, max: 72, step: 1 },
];

const EFFECT_FIELDS: Array<{ key: NumberFieldKey; label: string; min: number; max: number; step: number }> = [
  { key: "hoverInsetExpand", label: "Hover Inset Expand", min: 0, max: 60, step: 1 },
  { key: "hoverClampGlowOpacity", label: "Hover Clamp Glow", min: 0, max: 1, step: 0.01 },
  { key: "clickInsetExpand", label: "Click Inset Expand", min: 0, max: 80, step: 1 },
  { key: "clickRingFlashOpacity", label: "Click Ring Flash", min: 0, max: 1, step: 0.01 },
];

const COLOR_FIELDS: Array<{ key: ColorFieldKey; label: string }> = [
  { key: "textColor", label: "Text" },
  { key: "ringColor", label: "Ring" },
  { key: "outerGlowColor", label: "Outer Glow" },
  { key: "midGlowColor", label: "Mid Glow" },
  { key: "clickRingFlashColor", label: "Click Ring" },
  { key: "dotGlowColor", label: "Dot Glow" },
  { key: "dotCoreColor", label: "Dot Core" },
  { key: "sideStroke", label: "Side Stroke" },
  { key: "sideGlow", label: "Side Glow" },
  { key: "frontFillTop", label: "Clamp Top" },
  { key: "frontFillMid", label: "Clamp Mid" },
  { key: "frontFillBottom", label: "Clamp Bottom" },
  { key: "hoverClampGlowColor", label: "Hover Clamp Glow" },
  { key: "bodyCenter", label: "Body Center" },
  { key: "bodyMid", label: "Body Mid" },
  { key: "bodyEdge", label: "Body Edge" },
];

const DEFAULT_BUTTON = DEFAULT_HUD_ARTWORK_CONTROLS.button;
const DEFAULT_BUTTON_LABELS = DEFAULT_HUD_ARTWORK_CONTROLS.buttonLabels;
const BUTTON_POSITION_FIELDS: Array<{ key: NumberFieldKey; label: string; min: number; max: number; step: number }> = [
  { key: "buttonOffsetX", label: "Button Offset X", min: -320, max: 320, step: 1 },
  { key: "buttonOffsetY", label: "Button Offset Y", min: -180, max: 180, step: 1 },
];
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
const HUD_TUNING_SECTIONS: Array<{ key: HudTuningSectionKey; label: string }> = [
  { key: "overall", label: "Overall" },
  { key: "wings", label: "Wings" },
  { key: "dome", label: "Dome" },
  { key: "style", label: "Style" },
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

function fieldValue(control: HudButtonControls, key: keyof HudButtonControls) {
  return control[key];
}

function defaultButtonValue(key: keyof HudButtonControls) {
  return DEFAULT_BUTTON[key];
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  onReset?: () => void;
}) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}:</span>
        <input
          className="game-screen__hud-button-field-slider"
          aria-label={`${label} slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          className="game-screen__hud-button-field-number"
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {onReset ? (
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset}>
            ↺
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
  onReset,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  onReset?: () => void;
}) {
  return (
    <div className="game-screen__hud-button-field">
      <div className="game-screen__hud-button-field-line">
        <span className="game-screen__hud-button-field-label">{label}:</span>
        <input
          className="game-screen__hud-button-field-color"
          aria-label={label}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        {onReset ? (
          <button type="button" className="game-screen__hud-button-reset" onClick={onReset}>
            ↺
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="game-screen__hud-button-section">
      <strong>{title}</strong>
      <div className="game-screen__hud-button-grid">{children}</div>
    </section>
  );
}

function TabButton({
  active,
  compact = false,
  children,
  onClick,
}: {
  active: boolean;
  compact?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? compact
            ? "game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact game-screen__hud-button-modal-tab--active"
            : "game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--active"
          : compact
            ? "game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact"
            : "game-screen__hud-button-modal-tab"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function HudButtonEditorModal({
  open,
  initialWorkspaceSection,
  activeIndex,
  master,
  controls,
  buttonScale,
  buttonCount,
  buttonLabels,
  buttonVariants,
  buttonLayoutCopyState,
  showButtonGuides,
  layerVisibility,
  cardControls,
  cardVisualControls,
  tableLayoutState,
  lockWings,
  onClose,
  onSelectTab,
  onChangeButtonScale,
  onChangeButtonCount,
  onToggleLayer,
  onResetLayerVisibility,
  onHideAllLayers,
  onUpdateHudControls,
  onUndoHudControls,
  onCopyHudControls,
  onResetHudControls,
  onToggleWingLock,
  onSetHudWingControl,
  onSetSharedWingControl,
  onSetHudClampControl,
  onSetHudWingStyleControl,
  onSetHudDomeControl,
  onSetCardControls,
  onResetCardControls,
  onSetCardVisualControls,
  onResetTablePreset,
  onSetTableShapeField,
  onSetPlayerCount,
  onSetSeatField,
  onSelectSeat,
  onSetPlayerUiDefaults,
  onResetPlayerUiDefaults,
  onChangeMaster,
  onChangeVariant,
  onToggleVariantLink,
  onApplyMasterToAll,
  onResetButtons,
  onCopyButtonLayout,
  onSetLabel,
  onToggleButtonGuides,
}: HudButtonEditorModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const resizeStateRef = useRef<{ pointerId: number; startWidth: number; startHeight: number; startX: number; startY: number } | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 24, y: 24 });
  const [modalSize, setModalSize] = useState({ width: 832, height: 468 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<WorkspaceSectionKey>(
    initialWorkspaceSection ?? "hudButtons"
  );
  const [activeSection, setActiveSection] = useState<EditorSectionKey>("layout");
  const [activeHudTuningSection, setActiveHudTuningSection] = useState<HudTuningSectionKey>("overall");
  const [activeTableSection, setActiveTableSection] = useState<TableSectionKey>("shape");
  const [isMasterLinked, setIsMasterLinked] = useState(() => buttonVariants.every((variant) => variant?.linked ?? true));
  void onToggleVariantLink;

  const handleDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, textarea, select, label, a, [role='tab']")) {
      return;
    }

    const modal = modalRef.current;
    if (!modal) {
      return;
    }

    const rect = modal.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragPointerUp = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setIsMasterLinked(buttonVariants.every((variant) => variant?.linked ?? true));
  }, [buttonVariants, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveWorkspaceSection(initialWorkspaceSection ?? "hudButtons");
  }, [initialWorkspaceSection, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const width = Math.min(window.innerWidth - 32, Math.max(640, window.innerWidth * 0.62));
    const height = Math.min(window.innerHeight - 32, Math.max(360, window.innerHeight * 0.72));
    const x = Math.max(16, Math.round((window.innerWidth - width) / 2));
    const y = Math.max(16, Math.round((window.innerHeight - height) / 2));
    setModalPosition({ x, y });
    setModalSize({ width, height });
  }, [open]);

  const clampPosition = useMemo(() => {
    return (nextX: number, nextY: number, nextWidth = modalSize.width, nextHeight = modalSize.height) => {
      const modal = modalRef.current;
      if (!modal) {
        return { x: nextX, y: nextY };
      }

      const maxX = Math.max(16, window.innerWidth - nextWidth - 16);
      const maxY = Math.max(16, window.innerHeight - nextHeight - 16);
      return {
        x: Math.min(maxX, Math.max(16, nextX)),
        y: Math.min(maxY, Math.max(16, nextY)),
      };
    };
  }, [modalSize.height, modalSize.width]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleResize = () => {
      setModalPosition((current) => clampPosition(current.x, current.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition, open]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeStateRef.current;
      if (resize) {
        const deltaX = event.clientX - resize.startX;
        const deltaY = event.clientY - resize.startY;
        const maxWidth = Math.max(640, window.innerWidth - 32);
        const maxHeight = Math.max(360, window.innerHeight - 32);
        const nextWidth = Math.min(maxWidth, Math.max(640, resize.startWidth + deltaX));
        const nextHeight = Math.min(maxHeight, Math.max(360, resize.startHeight + deltaY));
        resizeStateRef.current = resize;
        setModalSize({ width: nextWidth, height: nextHeight });
        setModalPosition((current) => clampPosition(current.x, current.y, nextWidth, nextHeight));
        return;
      }

      const drag = dragStateRef.current;
      if (!drag) {
        return;
      }

      const nextX = event.clientX - drag.offsetX;
      const nextY = event.clientY - drag.offsetY;
      setModalPosition(clampPosition(nextX, nextY));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      resizeStateRef.current = null;
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [clampPosition]);

  if (!open) {
    return null;
  }

  const variant = activeIndex >= 0 ? buttonVariants[activeIndex] ?? { linked: true, overrides: {} } : null;
  const effective = activeIndex >= 0 && variant && !variant.linked ? { ...master, ...variant.overrides } : master;
  const linked = activeIndex >= 0 ? variant?.linked ?? true : true;
  const showButtonOverrides = activeIndex >= 0 && !isMasterLinked;

  const handleToggleMasterLink = () => {
    if (isMasterLinked) {
      setIsMasterLinked(false);
      return;
    }

    onApplyMasterToAll();
    setIsMasterLinked(true);
  };

  const renderLayout = (
    _control: HudButtonControls,
    _disabled: boolean,
  ) => (
    <>
      <Section title="Layout">
        <div className="game-screen__hud-button-field">
          <div className="game-screen__hud-button-field-line">
            <span className="game-screen__hud-button-field-label">Button Scale:</span>
            <input
              className="game-screen__hud-button-field-slider"
              type="range"
              min={0.5}
              max={1.5}
              step={0.01}
              value={buttonScale}
              aria-label="Button Scale slider"
              onChange={(event) => onChangeButtonScale(Number(event.target.value))}
            />
            <input
              className="game-screen__hud-button-field-number"
              type="number"
              min={0.5}
              max={1.5}
              step={0.01}
              value={buttonScale}
              aria-label="Button Scale"
              onChange={(event) => onChangeButtonScale(Number(event.target.value))}
            />
            <button type="button" className="game-screen__hud-button-reset" onClick={() => onChangeButtonScale(1)}>
              ↺
            </button>
          </div>
        </div>
        <div className="game-screen__hud-button-field">
          <div className="game-screen__hud-button-field-line">
            <span className="game-screen__hud-button-field-label">Button Count:</span>
            <input
              className="game-screen__hud-button-field-slider"
              type="range"
              min={1}
              max={6}
              step={1}
              value={buttonCount}
              aria-label="Button Count slider"
              onChange={(event) => onChangeButtonCount(Number(event.target.value))}
            />
            <input
              className="game-screen__hud-button-field-number"
              type="number"
              min={1}
              max={6}
              step={1}
              value={buttonCount}
              aria-label="Button Count"
              onChange={(event) => onChangeButtonCount(Number(event.target.value))}
            />
            <button type="button" className="game-screen__hud-button-reset" onClick={() => onChangeButtonCount(6)}>
              ↺
            </button>
          </div>
        </div>

        <div className="game-screen__hud-button-field game-screen__hud-button-field--wide">
          <span>Button Position</span>
          <div className="game-screen__hud-button-grid">
            {BUTTON_POSITION_FIELDS.map((field) => (
              <NumberField
                key={field.key}
                label={field.label}
                value={fieldValue(master, field.key) as number}
                min={field.min}
                max={field.max}
                step={field.step}
                onChange={(next) => onChangeMaster(field.key, next)}
                onReset={() => onChangeMaster(field.key, defaultButtonValue(field.key) as number)}
              />
            ))}
          </div>
        </div>

        <div className="game-screen__hud-button-field game-screen__hud-button-field--wide">
          <span>Button Labels</span>
          <div className="game-screen__hud-button-label-grid">
            {["A", "B", "C", "D", "E", "F"].map((slot, index) => (
              <div key={slot} className="game-screen__hud-button-label-field">
                <div className="game-screen__hud-button-label-line">
                  <span className="game-screen__hud-button-field-label">{slot}:</span>
                  <input
                    type="text"
                    value={buttonLabels[index] ?? slot}
                    aria-label={`${slot} label`}
                    onChange={(event) => onSetLabel(index, event.target.value)}
                  />
                  <button type="button" className="game-screen__hud-button-reset" onClick={() => onSetLabel(index, DEFAULT_BUTTON_LABELS[index] ?? slot)}>
                    ↺
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {showButtonOverrides ? (
        <>
          <Section title="Button Text">
            <div className="game-screen__hud-button-field game-screen__hud-button-field--wide">
              <div className="game-screen__hud-button-field-row">
                <span>Label</span>
                <button
                  type="button"
                  className="game-screen__hud-button-reset"
                  onClick={() => onSetLabel(activeIndex, DEFAULT_BUTTON_LABELS[activeIndex] ?? "")}
                >
                  ↺
                </button>
              </div>
              <input
                type="text"
                value={buttonLabels[activeIndex] ?? ""}
                aria-label="Button label"
                onChange={(event) => onSetLabel(activeIndex, event.target.value)}
              />
            </div>
          </Section>
        </>
      ) : null}
    </>
  );

  const renderGeometry = (
    control: HudButtonControls,
    disabled: boolean,
    onFieldChange: (field: keyof HudButtonControls, value: number | string) => void,
  ) => (
    <Section title="Geometry">
      {LAYOUT_FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={fieldValue(control, field.key) as number}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          onChange={(next) => onFieldChange(field.key, next)}
          onReset={() => onFieldChange(field.key, defaultButtonValue(field.key) as number)}
        />
      ))}
    </Section>
  );

  const renderEffects = (
    control: HudButtonControls,
    disabled: boolean,
    onFieldChange: (field: keyof HudButtonControls, value: number | string) => void,
  ) => (
    <Section title="Effects">
      {EFFECT_FIELDS.map((field) => (
        <NumberField
          key={field.key}
          label={field.label}
          value={fieldValue(control, field.key) as number}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          onChange={(next) => onFieldChange(field.key, next)}
          onReset={() => onFieldChange(field.key, defaultButtonValue(field.key) as number)}
        />
      ))}
    </Section>
  );

  const renderColors = (
    control: HudButtonControls,
    disabled: boolean,
    onFieldChange: (field: keyof HudButtonControls, value: number | string) => void,
  ) => (
    <Section title="Colours">
      {COLOR_FIELDS.map((field) => (
        <ColorField
          key={field.key}
          label={field.label}
          value={fieldValue(control, field.key) as string}
          disabled={disabled}
          onChange={(next) => onFieldChange(field.key, next)}
          onReset={() => onFieldChange(field.key, defaultButtonValue(field.key) as string)}
        />
      ))}
    </Section>
  );

  const renderLayerSplit = () => (
    <section className="game-screen__hud-button-tab-panel">
      <div className="game-screen__hud-button-modal-subsection">
        <strong>Layer Split</strong>
        <div className="game-screen__hud-button-modal-subsection-actions">
          <button type="button" onClick={onResetLayerVisibility}>
            Reset
          </button>
          <button type="button" onClick={onHideAllLayers}>
            Hide all
          </button>
        </div>
        <div className="game-screen__hud-button-modal-subsection-grid">
          {LAYER_OPTIONS.map((option) => (
            <label key={option.key} className="game-screen__hud-button-modal-toggle">
              <input type="checkbox" checked={layerVisibility[option.key]} onChange={() => onToggleLayer(option.key)} />
              <span>{option.label}</span>
            </label>
          ))}
      </div>
      </div>
    </section>
  );

  const renderHudTuning = () => (
    <section className="game-screen__hud-button-tab-panel">
      <div className="game-screen__hud-button-modal-section-header">
        <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--section" role="tablist" aria-label="HUD tuning sections">
          {HUD_TUNING_SECTIONS.map((tab) => (
            <TabButton key={tab.key} compact active={activeHudTuningSection === tab.key} onClick={() => setActiveHudTuningSection(tab.key)}>
              {tab.label}
            </TabButton>
          ))}
        </div>
        <div className="game-screen__hud-button-modal-actions game-screen__hud-button-modal-actions--section">
          <button type="button" onClick={onUndoHudControls}>
            Undo
          </button>
          <button type="button" onClick={onCopyHudControls}>
            Copy HUD
          </button>
          <button type="button" onClick={onResetHudControls}>
            Reset HUD
          </button>
        </div>
      </div>

      {activeHudTuningSection === "overall" ? (
        <Section title="Overall">
          <NumberField
            label="Overall X"
            value={controls.hudOffsetX}
            min={-320}
            max={320}
            step={1}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                hudOffsetX: next,
              }))
            }
          />
          <NumberField
            label="Overall Y"
            value={controls.hudOffsetY}
            min={-180}
            max={180}
            step={1}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                hudOffsetY: next,
              }))
            }
          />
          <NumberField
            label="Canvas Width"
            value={controls.width}
            min={720}
            max={1200}
            step={10}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                width: next,
              }))
            }
          />
          <NumberField
            label="Canvas Height"
            value={controls.height}
            min={240}
            max={520}
            step={5}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                height: next,
              }))
            }
          />
          <NumberField
            label="Overall Scale"
            value={controls.overallScale}
            min={0.5}
            max={2}
            step={0.01}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                overallScale: next,
              }))
            }
          />
        </Section>
      ) : null}

      {activeHudTuningSection === "wings" ? (
        <Section title="Wings">
          <div className="game-screen__hud-button-modal-actions game-screen__hud-button-modal-actions--section">
            <button type="button" onClick={onToggleWingLock}>
              {lockWings ? "Unlock Wings" : "Lock Wings"}
            </button>
          </div>
          <NumberField
            label="Left X"
            value={controls.leftWing.x}
            min={-240}
            max={520}
            step={1}
            onChange={(next) => onSetHudWingControl("leftWing", "x", next)}
          />
          <NumberField
            label="Right X"
            value={controls.rightWing.x}
            min={-240}
            max={1120}
            step={1}
            onChange={(next) => onSetHudWingControl("rightWing", "x", next)}
          />
          {lockWings ? (
            <>
              <NumberField label="Wing Y" value={controls.leftWing.y} min={120} max={320} step={1} onChange={(next) => onSetSharedWingControl("y", next)} />
              <NumberField label="Wing Width" value={controls.leftWing.width} min={240} max={620} step={1} onChange={(next) => onSetSharedWingControl("width", next)} />
              <NumberField
                label="Wing Height"
                value={controls.leftWing.height}
                min={60}
                max={220}
                step={1}
                onChange={(next) => onSetSharedWingControl("height", next)}
              />
              <NumberField
                label="Top Radius"
                value={controls.leftWing.topRadius}
                min={0}
                max={80}
                step={1}
                onChange={(next) => onSetSharedWingControl("topRadius", next)}
              />
            </>
          ) : (
            <>
              <NumberField label="Left Y" value={controls.leftWing.y} min={120} max={320} step={1} onChange={(next) => onSetHudWingControl("leftWing", "y", next)} />
              <NumberField label="Left Width" value={controls.leftWing.width} min={240} max={620} step={1} onChange={(next) => onSetHudWingControl("leftWing", "width", next)} />
              <NumberField
                label="Left Height"
                value={controls.leftWing.height}
                min={60}
                max={220}
                step={1}
                onChange={(next) => onSetHudWingControl("leftWing", "height", next)}
              />
              <NumberField
                label="Left Top Radius"
                value={controls.leftWing.topRadius}
                min={0}
                max={80}
                step={1}
                onChange={(next) => onSetHudWingControl("leftWing", "topRadius", next)}
              />
              <NumberField label="Right Y" value={controls.rightWing.y} min={120} max={320} step={1} onChange={(next) => onSetHudWingControl("rightWing", "y", next)} />
              <NumberField label="Right Width" value={controls.rightWing.width} min={240} max={620} step={1} onChange={(next) => onSetHudWingControl("rightWing", "width", next)} />
              <NumberField
                label="Right Height"
                value={controls.rightWing.height}
                min={60}
                max={220}
                step={1}
                onChange={(next) => onSetHudWingControl("rightWing", "height", next)}
              />
              <NumberField
                label="Right Top Radius"
                value={controls.rightWing.topRadius}
                min={0}
                max={80}
                step={1}
                onChange={(next) => onSetHudWingControl("rightWing", "topRadius", next)}
              />
            </>
          )}
        </Section>
      ) : null}

      {activeHudTuningSection === "dome" ? (
        <Section title="Dome">
          <NumberField label="X" value={controls.dome.cx} min={160} max={760} step={1} onChange={(next) => onSetHudDomeControl("cx", next)} />
          <NumberField label="Y" value={controls.dome.cy} min={160} max={420} step={1} onChange={(next) => onSetHudDomeControl("cy", next)} />
          <NumberField label="Radius" value={controls.dome.radius} min={80} max={320} step={1} onChange={(next) => onSetHudDomeControl("radius", next)} />
          <NumberField label="Edge" value={controls.dome.edgeWidth} min={1} max={12} step={1} onChange={(next) => onSetHudDomeControl("edgeWidth", next)} />
          <NumberField label="Glow" value={controls.dome.glowWidth} min={0} max={28} step={1} onChange={(next) => onSetHudDomeControl("glowWidth", next)} />
          <NumberField
            label="Glow Opacity"
            value={controls.dome.glowOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(next) => onSetHudDomeControl("glowOpacity", next)}
          />
        </Section>
      ) : null}

      {activeHudTuningSection === "style" ? (
        <Section title="Style">
          <NumberField label="Clamp Width" value={controls.clamp.width} min={8} max={40} step={1} onChange={(next) => onSetHudClampControl("width", next)} />
          <NumberField label="Clamp Height" value={controls.clamp.height} min={40} max={120} step={1} onChange={(next) => onSetHudClampControl("height", next)} />
          <NumberField
            label="Clamp Radius"
            value={controls.clamp.rightRadius}
            min={0}
            max={30}
            step={1}
            onChange={(next) => onSetHudClampControl("rightRadius", next)}
          />
          <NumberField
            label="Glass Opacity"
            value={controls.panelGlassOpacity}
            min={0}
            max={0.2}
            step={0.01}
            onChange={(next) =>
              onUpdateHudControls((current) => ({
                ...current,
                panelGlassOpacity: next,
              }))
            }
          />
          <NumberField
            label="Wing Edge"
            value={controls.wingStyle.edgeWidth}
            min={1}
            max={8}
            step={1}
            onChange={(next) => onSetHudWingStyleControl("edgeWidth", next)}
          />
          <NumberField
            label="Wing Glow"
            value={controls.wingStyle.glowWidth}
            min={0}
            max={20}
            step={1}
            onChange={(next) => onSetHudWingStyleControl("glowWidth", next)}
          />
          <NumberField
            label="Wing Glow Opacity"
            value={controls.wingStyle.glowOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(next) => onSetHudWingStyleControl("glowOpacity", next)}
          />
          <ColorField label="Panel Top" value={controls.panelTop} onChange={(next) => onUpdateHudControls((current) => ({ ...current, panelTop: next }))} />
          <ColorField label="Panel Mid" value={controls.panelMid} onChange={(next) => onUpdateHudControls((current) => ({ ...current, panelMid: next }))} />
          <ColorField
            label="Panel Bottom"
            value={controls.panelBottom}
            onChange={(next) => onUpdateHudControls((current) => ({ ...current, panelBottom: next }))}
          />
          <ColorField
            label="Wing Edge Color"
            value={controls.wingStyle.edgeColor}
            onChange={(next) => onSetHudWingStyleControl("edgeColor", next)}
          />
          <ColorField
            label="Wing Glow Color"
            value={controls.wingStyle.glowColor}
            onChange={(next) => onSetHudWingStyleControl("glowColor", next)}
          />
          <ColorField label="Clamp Gold Top" value={controls.clamp.goldTop} onChange={(next) => onSetHudClampControl("goldTop", next)} />
          <ColorField label="Clamp Gold Mid" value={controls.clamp.goldMid} onChange={(next) => onSetHudClampControl("goldMid", next)} />
          <ColorField
            label="Clamp Gold Bottom"
            value={controls.clamp.goldBottom}
            onChange={(next) => onSetHudClampControl("goldBottom", next)}
          />
          <ColorField label="Dome Edge" value={controls.dome.edgeColor} onChange={(next) => onSetHudDomeControl("edgeColor", next)} />
          <ColorField label="Dome Inner" value={controls.dome.edgeInnerColor} onChange={(next) => onSetHudDomeControl("edgeInnerColor", next)} />
          <ColorField label="Dome Glow Color" value={controls.dome.glowColor} onChange={(next) => onSetHudDomeControl("glowColor", next)} />
        </Section>
      ) : null}
    </section>
  );

  const renderTable = () => {
    const selectedSeatId = tableLayoutState.selectedSeatId ?? tableLayoutState.seats[0]?.id ?? null;
    const selectedSeat =
      tableLayoutState.seats.find((seat) => seat.id === selectedSeatId) ?? tableLayoutState.seats[0] ?? null;
    const playerUiDefaults = {
      ...PlayerUIConfig.DEFAULTS,
      ...(tableLayoutState.asset?.layout.playerUiDefaults ?? {}),
    };

    return (
      <section className="game-screen__hud-button-tab-panel">
        <div className="game-screen__hud-button-modal-section-header">
          <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--section" role="tablist" aria-label="Table sections">
            {TABLE_SECTIONS.map((tab) => (
              <TabButton key={tab.key} compact active={activeTableSection === tab.key} onClick={() => setActiveTableSection(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </div>
          <div className="game-screen__hud-button-modal-actions game-screen__hud-button-modal-actions--section">
            <button type="button" onClick={onResetTablePreset}>
              Reset Preset
            </button>
            <button type="button" onClick={onResetPlayerUiDefaults}>
              Reset Player UI
            </button>
          </div>
        </div>

        {activeTableSection === "shape" ? (
          <Section title="Table Shape">
            <NumberField
              label="Player Count"
              value={tableLayoutState.playerCount}
              min={2}
              max={10}
              step={1}
              onChange={onSetPlayerCount}
            />
            <NumberField
              label="Width"
              value={tableLayoutState.table.width ?? 960}
              min={640}
              max={1400}
              step={1}
              onChange={(next) => onSetTableShapeField("width", next)}
            />
            <NumberField
              label="Height"
              value={tableLayoutState.table.height ?? 560}
              min={360}
              max={900}
              step={1}
              onChange={(next) => onSetTableShapeField("height", next)}
            />
            <NumberField
              label="Offset X"
              value={tableLayoutState.table.offsetX ?? 0}
              min={-320}
              max={320}
              step={1}
              onChange={(next) => onSetTableShapeField("offsetX", next)}
            />
            <NumberField
              label="Offset Y"
              value={tableLayoutState.table.offsetY ?? -78}
              min={-320}
              max={320}
              step={1}
              onChange={(next) => onSetTableShapeField("offsetY", next)}
            />
            <NumberField
              label="Curvature"
              value={tableLayoutState.table.curvature ?? 0.88}
              min={0.2}
              max={1.4}
              step={0.01}
              onChange={(next) => onSetTableShapeField("curvature", next)}
            />
            <NumberField
              label="Felt Inset"
              value={tableLayoutState.table.feltInset ?? -8}
              min={-60}
              max={40}
              step={1}
              onChange={(next) => onSetTableShapeField("feltInset", next)}
            />
            <NumberField
              label="Rim Thickness"
              value={tableLayoutState.table.rimThickness ?? 0}
              min={0}
              max={60}
              step={1}
              onChange={(next) => onSetTableShapeField("rimThickness", next)}
            />
            <NumberField
              label="Inner Rim Thickness"
              value={tableLayoutState.table.innerRimThickness ?? 0}
              min={0}
              max={60}
              step={1}
              onChange={(next) => onSetTableShapeField("innerRimThickness", next)}
            />
            <ColorField label="Rim Color" value={tableLayoutState.table.rimColor ?? "#ffffff"} onChange={(next) => onSetTableShapeField("rimColor", next)} />
            <ColorField label="Inner Rim Color" value={tableLayoutState.table.innerRimColor ?? "#ffffff"} onChange={(next) => onSetTableShapeField("innerRimColor", next)} />
            <ColorField label="Felt Inner" value={tableLayoutState.table.feltInner ?? "#0f2f4a"} onChange={(next) => onSetTableShapeField("feltInner", next)} />
            <ColorField label="Felt Outer" value={tableLayoutState.table.feltOuter ?? "#081b2c"} onChange={(next) => onSetTableShapeField("feltOuter", next)} />
            <ColorField label="Emblem Inner" value={tableLayoutState.table.emblemInnerColor ?? "#ffffff"} onChange={(next) => onSetTableShapeField("emblemInnerColor", next)} />
            <ColorField label="Emblem Outer" value={tableLayoutState.table.emblemOuterColor ?? "#ffffff"} onChange={(next) => onSetTableShapeField("emblemOuterColor", next)} />
          </Section>
        ) : null}

        {activeTableSection === "seats" ? (
          <Section title="Seats">
            <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--section" role="tablist" aria-label="Seat selectors">
              {tableLayoutState.seats.map((seat) => (
                <TabButton key={seat.id} compact active={seat.id === selectedSeatId} onClick={() => onSelectSeat(seat.id)}>
                  {seat.label ?? `Seat ${seat.id + 1}`}
                </TabButton>
              ))}
            </div>
            {selectedSeat ? (
              <>
                <NumberField
                  label="Seat X"
                  value={selectedSeat.position?.x ?? 0.5}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(next) => onSetSeatField(selectedSeat.id, "x", next)}
                />
                <NumberField
                  label="Seat Y"
                  value={selectedSeat.position?.y ?? 0.5}
                  min={0}
                  max={1}
                  step={0.001}
                  onChange={(next) => onSetSeatField(selectedSeat.id, "y", next)}
                />
                <NumberField
                  label="Seat Rotation"
                  value={selectedSeat.rotation ?? 0}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(next) => onSetSeatField(selectedSeat.id, "rotation", next)}
                />
                <NumberField
                  label="Seat Scale"
                  value={selectedSeat.scale ?? 1}
                  min={0.25}
                  max={2}
                  step={0.01}
                  onChange={(next) => onSetSeatField(selectedSeat.id, "scale", next)}
                />
                <label className="game-screen__hud-button-field">
                  <span className="game-screen__hud-button-field-label">Seat Label:</span>
                  <input
                    className="game-screen__hud-button-field-number"
                    type="text"
                    value={selectedSeat.label ?? ""}
                    onChange={(event) => onSetSeatField(selectedSeat.id, "label", event.target.value)}
                  />
                </label>
              </>
            ) : (
              <div className="game-screen__hud-button-placeholder">No seat selected.</div>
            )}
          </Section>
        ) : null}

        {activeTableSection === "playerUi" ? (
          <Section title="Player UI Defaults">
            <NumberField
              label="Arc Rotation"
              value={playerUiDefaults.baseArcRotation}
              min={0}
              max={360}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, baseArcRotation: next }))}
            />
            <NumberField
              label="Info Angle"
              value={playerUiDefaults.infoBoxAngle}
              min={0}
              max={360}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, infoBoxAngle: next }))}
            />
            <NumberField
              label="Info Rotation"
              value={playerUiDefaults.infoBoxRotation}
              min={0}
              max={360}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, infoBoxRotation: next }))}
            />
            <NumberField
              label="Label Offset"
              value={playerUiDefaults.labelTextOffset}
              min={0}
              max={1000}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, labelTextOffset: next }))}
            />
            <NumberField
              label="Avatar Scale"
              value={playerUiDefaults.avatarImageScale}
              min={0.1}
              max={3}
              step={0.01}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, avatarImageScale: next }))}
            />
            <NumberField
              label="Info Box Width"
              value={playerUiDefaults.infoBoxWidth}
              min={80}
              max={400}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, infoBoxWidth: next }))}
            />
            <NumberField
              label="Info Box Height"
              value={playerUiDefaults.infoBoxHeight}
              min={20}
              max={180}
              step={1}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, infoBoxHeight: next }))}
            />
            <NumberField
              label="Overall Scale"
              value={playerUiDefaults.overallScale}
              min={0.25}
              max={3}
              step={0.01}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, overallScale: next }))}
            />
            <ColorField
              label="Label Color"
              value={playerUiDefaults.labelColor}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, labelColor: next }))}
            />
            <ColorField
              label="Avatar Base"
              value={playerUiDefaults.avatarBaseColor}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, avatarBaseColor: next }))}
            />
            <ColorField
              label="Info Box Color"
              value={playerUiDefaults.infoBoxColor}
              onChange={(next) => onSetPlayerUiDefaults((current) => ({ ...current, infoBoxColor: next }))}
            />
          </Section>
        ) : null}
      </section>
    );
  };

  const renderCardVisuals = () => (
    <section className="game-screen__hud-button-tab-panel">
      <div className="game-screen__hud-button-modal-subsection">
        <strong>Card Visuals</strong>
        <label className="game-screen__hud-button-modal-toggle">
          <span>Float Scale {cardVisualControls.floatScale.toFixed(2)}</span>
          <input
            type="number"
            min={0.25}
            max={8}
            step={0.25}
            value={cardVisualControls.floatScale}
            onChange={(event) =>
              onSetCardVisualControls((current) => ({ ...current, floatScale: Number(event.target.value) }))
            }
          />
          <input
            type="range"
            min={0.25}
            max={8}
            step={0.25}
            value={cardVisualControls.floatScale}
            onChange={(event) =>
              onSetCardVisualControls((current) => ({ ...current, floatScale: Number(event.target.value) }))
            }
          />
        </label>
      </div>
    </section>
  );

  const renderCardInHand = () => (
    <section className="game-screen__hud-button-tab-panel">
      <div className="game-screen__hud-button-modal-section-header">
        <strong>Card Fan</strong>
        <div className="game-screen__hud-button-modal-actions game-screen__hud-button-modal-actions--section">
          <button type="button" onClick={onResetCardControls}>
            Reset Fan
          </button>
        </div>
      </div>

      <Section title="Fan">
        <NumberField
          label="Card Count"
          value={cardControls.cardCount}
          min={cardControls.minCardCount}
          max={cardControls.maxCardCount}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, cardCount: next }))}
        />
        <NumberField
          label="Min Card Count"
          value={cardControls.minCardCount}
          min={1}
          max={cardControls.maxCardCount}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, minCardCount: next }))}
        />
        <NumberField
          label="Max Card Count"
          value={cardControls.maxCardCount}
          min={cardControls.minCardCount}
          max={20}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, maxCardCount: next }))}
        />
        <NumberField
          label="Min Arc"
          value={cardControls.arcMin}
          min={20}
          max={90}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, arcMin: next }))}
        />
        <NumberField
          label="Max Arc"
          value={cardControls.arcMax}
          min={90}
          max={170}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, arcMax: next }))}
        />
      </Section>

      <Section title="Sizing">
        <NumberField
          label="Radius Scale"
          value={cardControls.radiusScale}
          min={0.1}
          max={2}
          step={0.01}
          onChange={(next) => onSetCardControls((current) => ({ ...current, radiusScale: next }))}
        />
        <NumberField
          label="Radius Offset"
          value={cardControls.radiusOffset}
          min={-240}
          max={240}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, radiusOffset: next }))}
        />
        <NumberField
          label="Card Width Scale"
          value={cardControls.cardWidthScale}
          min={0.28}
          max={0.8}
          step={0.01}
          onChange={(next) => onSetCardControls((current) => ({ ...current, cardWidthScale: next }))}
        />
      </Section>

      <Section title="Placement">
        <NumberField
          label="Fan Tilt"
          value={cardControls.fanTilt}
          min={-90}
          max={90}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, fanTilt: next }))}
        />
        <NumberField
          label="Center Offset X"
          value={cardControls.centerOffsetX}
          min={-200}
          max={200}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, centerOffsetX: next }))}
        />
        <NumberField
          label="Center Offset Y"
          value={cardControls.centerOffsetY}
          min={-200}
          max={200}
          step={1}
          onChange={(next) => onSetCardControls((current) => ({ ...current, centerOffsetY: next }))}
        />
        <label className="game-screen__hud-button-modal-toggle">
          <input
            type="checkbox"
            checked={cardControls.disableViewportScale}
            onChange={(event) => onSetCardControls((current) => ({ ...current, disableViewportScale: event.target.checked }))}
          />
          <span>Disable viewport scale</span>
        </label>
      </Section>
    </section>
  );

  return (
    <div className="game-screen__hud-button-modal-backdrop">
      <button
        type="button"
        className="game-screen__hud-button-modal-dismiss"
        aria-label="Close HUD Button Editor"
        onClick={onClose}
      />
      <div
        className="game-screen__hud-button-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="HUD Button Editor"
        data-dragging={isDragging ? "true" : "false"}
        data-resizing={isResizing ? "true" : "false"}
        style={{
          left: `${modalPosition.x}px`,
          top: `${modalPosition.y}px`,
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
        }}
      >
        <div className="game-screen__hud-button-modal-titlebar" onPointerDown={handleDragPointerDown} onPointerUp={handleDragPointerUp}>
          <div className="game-screen__hud-button-modal-drag-space" aria-hidden="true" />
          <button type="button" className="game-screen__hud-button-modal-close" aria-label="Close HUD Button Editor" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="game-screen__hud-button-modal-toolbar">
          <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--workspace" role="tablist" aria-label="Workspace tabs">
            {WORKSPACE_TABS.map((tab) => (
              <TabButton key={tab.key} active={activeWorkspaceSection === tab.key} onClick={() => setActiveWorkspaceSection(tab.key)}>
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="game-screen__hud-button-modal-content">
              {activeWorkspaceSection === "layerSplit" ? (
                renderLayerSplit()
              ) : activeWorkspaceSection === "hudTuning" ? (
                renderHudTuning()
              ) : activeWorkspaceSection === "table" ? (
                renderTable()
              ) : activeWorkspaceSection === "cardVisuals" ? (
                renderCardVisuals()
              ) : activeWorkspaceSection === "cardInHand" ? (
            renderCardInHand()
          ) : (
            <>
              <div className="game-screen__hud-button-modal-section-header">
                <div className="game-screen__hud-button-modal-tabs game-screen__hud-button-modal-tabs--section" role="tablist" aria-label="HUD Button tabs">
                  {HUD_BUTTON_SECTIONS.map((tab) => (
                    <TabButton key={tab.key} compact active={activeSection === tab.key} onClick={() => setActiveSection(tab.key)}>
                      {tab.label}
                    </TabButton>
                  ))}
                  {!isMasterLinked
                    ? HUD_BUTTON_SLOTS.map((slot, index) => (
                        <button
                          key={slot}
                          type="button"
                          className={
                            activeIndex === index
                              ? "game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact game-screen__hud-button-modal-tab--active"
                              : "game-screen__hud-button-modal-tab game-screen__hud-button-modal-tab--compact"
                          }
                          onClick={() => onSelectTab(index)}
                        >
                          {buttonLabels[index] || slot}
                        </button>
                      ))
                    : null}
                </div>

                <div className="game-screen__hud-button-modal-actions game-screen__hud-button-modal-actions--section">
                  <button type="button" onClick={() => setModalPosition({ x: 24, y: 24 })}>
                    Reset Position
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetButtons();
                      setIsMasterLinked(true);
                    }}
                  >
                    Reset Buttons
                  </button>
                  <button type="button" onClick={onCopyButtonLayout}>
                    {buttonLayoutCopyState === "copied" ? "Layout Copied" : buttonLayoutCopyState === "failed" ? "Copy Failed" : "Copy Button Layout"}
                  </button>
                  <button type="button" data-active={isMasterLinked ? "true" : "false"} onClick={handleToggleMasterLink}>
                    {isMasterLinked ? "Linked to master" : "Link all to master"}
                  </button>
                  <button type="button" data-active={showButtonGuides ? "true" : "false"} onClick={onToggleButtonGuides}>
                    {showButtonGuides ? "Button Guides On" : "Button Guides Off"}
                  </button>
                </div>
              </div>

              {activeSection === "layout"
                ? renderLayout(master, false)
                : activeSection === "geometry"
                  ? renderGeometry(activeIndex < 0 ? master : effective, activeIndex >= 0 ? linked : false, (field, value) =>
                      activeIndex < 0 ? onChangeMaster(field, value) : onChangeVariant(activeIndex, field, value)
                    )
                  : activeSection === "effects"
                    ? renderEffects(activeIndex < 0 ? master : effective, activeIndex >= 0 ? linked : false, (field, value) =>
                        activeIndex < 0 ? onChangeMaster(field, value) : onChangeVariant(activeIndex, field, value)
                      )
                    : renderColors(activeIndex < 0 ? master : effective, activeIndex >= 0 ? linked : false, (field, value) =>
                        activeIndex < 0 ? onChangeMaster(field, value) : onChangeVariant(activeIndex, field, value)
                      )}
            </>
          )}
        </div>

        <button
          type="button"
          className="game-screen__hud-button-modal-resize"
          aria-label="Resize HUD Button Editor"
          onPointerDown={(event) => {
            const modal = modalRef.current;
            if (!modal) {
              return;
            }

            const rect = modal.getBoundingClientRect();
            resizeStateRef.current = {
              pointerId: event.pointerId,
              startWidth: rect.width,
              startHeight: rect.height,
              startX: event.clientX,
              startY: event.clientY,
            };
            setIsResizing(true);
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
          onPointerUp={() => {
            resizeStateRef.current = null;
            setIsResizing(false);
          }}
        />
      </div>
    </div>
  );
}

export default HudButtonEditorModal;


