import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameHeader } from '@ocentra/core-ui';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { useSolanaBridge } from '@/adapters/solana/useSolanaBridge';
import { buildHomePath } from '@/ui/navigation/appRoutes';
import GameBackground from './CardGameComponents/GameBackground';
import GameHUD from './GameHUD';
import CardInHand from './CardGameComponents/CardInHand';
import CenterTableSvg from './CardGameComponents/CenterTableSvg';
import PlayersOnTable from './PlayersOnTable';
import HudButtonEditorModal from './HudButtonEditorModal';
import './GameScreen.css';
import { GameModeProvider } from '@/ui/gameMode/GameModeContext';
import { setGameAsset, tableLayoutStore } from '@/ui/layout/tableLayoutStore';
import type { TableLayoutState } from '@/ui/layout/tableLayoutTypes';
import { DEFAULT_HUD_ARTWORK_CONTROLS, type HudArtworkControls } from './HudArtwork.types';
import { PlayerUIConfig } from './PlayerUI';
import type { TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';

type LayerKey = 'background' | 'header' | 'table' | 'seats' | 'cards' | 'hud' | 'tools' | 'footer';
type HudWingConfig = HudArtworkControls['leftWing'];
type HudClampConfig = HudArtworkControls['clamp'];
type HudWingStyleConfig = HudArtworkControls['wingStyle'];
type HudDomeConfig = HudArtworkControls['dome'];
type HudButtonConfig = HudArtworkControls['button'];
type HudButtonVariantConfig = HudArtworkControls['buttonVariants'][number];

const DEFAULT_LAYER_VISIBILITY: Record<LayerKey, boolean> = {
  background: true,
  header: true,
  table: true,
  seats: true,
  cards: true,
  hud: true,
  tools: true,
  footer: true,
};
const DEFAULT_CARD_CONTROLS = {
  cardCount: 13,
  minCardCount: 3,
  maxCardCount: 13,
  radiusScale: 0.41,
  radiusOffset: 0,
  cardWidthScale: 0.38,
  arcMin: 34,
  arcMax: 149,
  fanTilt: 0,
  centerOffsetX: 0,
  centerOffsetY: 0,
  disableViewportScale: true,
};

export const GameScreen: React.FC = () => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYER_VISIBILITY);
  const [cardControls, setCardControls] = useState({ ...DEFAULT_CARD_CONTROLS });
  const [cardVisualControls, setCardVisualControls] = useState({
    floatScale: 3,
  });
  const tableLayoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState
  );
  const [hudControls, setHudControls] = useState<HudArtworkControls>({ ...DEFAULT_HUD_ARTWORK_CONTROLS });
  const hudUndoStackRef = useRef<HudArtworkControls[]>([]);
  const [lockWings, setLockWings] = useState(true);
  const [buttonLayoutCopyState, setButtonLayoutCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [showHudButtonGuides, setShowHudButtonGuides] = useState(false);
  const [showHudButtonEditor, setShowHudButtonEditor] = useState(false);
  const [hudButtonEditorTab, setHudButtonEditorTab] = useState(-1);
  const buttonLayoutCopyResetRef = useRef<number | null>(null);

  const updateHudControls = useCallback(
    (updater: (current: HudArtworkControls) => HudArtworkControls) => {
      setHudControls((current) => {
        const next = updater(current);
        hudUndoStackRef.current = [...hudUndoStackRef.current, current];
        return next;
      });
    },
    []
  );

  const undoHudControls = useCallback(() => {
    const history = hudUndoStackRef.current;
    if (history.length === 0) {
      return;
    }

    const previous = history[history.length - 1];
    setHudControls(previous);
    hudUndoStackRef.current = history.slice(0, -1);
  }, []);

  const copyHudControls = useCallback(async () => {
    const payload = JSON.stringify(hudControls, null, 2);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      return;
    }
  }, [hudControls]);

  const copyButtonLayout = useCallback(async () => {
    const payload = JSON.stringify(
      {
        buttonScale: hudControls.buttonScale,
        buttonCount: hudControls.buttonCount,
        buttonLabels: hudControls.buttonLabels,
        button: hudControls.button,
        buttonVariants: hudControls.buttonVariants,
      },
      null,
      2,
    );

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setButtonLayoutCopyState('copied');
      if (buttonLayoutCopyResetRef.current !== null) {
        window.clearTimeout(buttonLayoutCopyResetRef.current);
      }
      buttonLayoutCopyResetRef.current = window.setTimeout(() => {
        setButtonLayoutCopyState('idle');
        buttonLayoutCopyResetRef.current = null;
      }, 1500);
    } catch {
      setButtonLayoutCopyState('failed');
      if (buttonLayoutCopyResetRef.current !== null) {
        window.clearTimeout(buttonLayoutCopyResetRef.current);
      }
      buttonLayoutCopyResetRef.current = window.setTimeout(() => {
        setButtonLayoutCopyState('idle');
        buttonLayoutCopyResetRef.current = null;
      }, 1500);
    }
  }, [hudControls]);

  const resetButtons = useCallback(() => {
    updateHudControls((current) => ({
      ...current,
      buttonCount: 6,
      buttonScale: 1,
      buttonLabels: ["A", "B", "C", "D", "E", "F"],
      button: { ...DEFAULT_HUD_ARTWORK_CONTROLS.button },
      buttonVariants: DEFAULT_HUD_ARTWORK_CONTROLS.buttonVariants.map((variant) => ({
        linked: variant.linked,
        overrides: { ...variant.overrides },
      })),
    }));
  }, [updateHudControls]);

  const resetTablePreset = useCallback(() => {
    tableLayoutStore.applyPreset(tableLayoutState.playerCount);
  }, [tableLayoutState.playerCount]);

  const setTableShapeField = useCallback(
    (field: keyof TableShapeSettings, value: number | string) => {
      tableLayoutStore.setTable({
        ...(tableLayoutState.table ?? {}),
        [field]: value,
      } as TableShapeSettings);
    },
    [tableLayoutState.table]
  );

  const setTableSeatField = useCallback(
    (seatId: number, field: "label" | "x" | "y" | "rotation" | "scale", value: number | string) => {
      tableLayoutStore.setSeats(
        tableLayoutState.seats.map((seat) => {
          if (seat.id !== seatId) {
            return seat;
          }

          if (field === "label") {
            return {
              ...seat,
              label: String(value),
            };
          }

          if (field === "x" || field === "y") {
            return {
              ...seat,
              position: {
                ...seat.position,
                [field]: Number(value),
              },
            };
          }

          return {
            ...seat,
            [field]: field === "scale" ? Number(value) : Number(value),
          };
        })
      );
    },
    [tableLayoutState.seats]
  );

  const setPlayerUiDefaults = useCallback(
    (updater: (current: Partial<PlayerUIConfig>) => Partial<PlayerUIConfig>) => {
      const asset = tableLayoutState.asset;
      if (!asset) {
        return;
      }

      const nextDefaults = updater({ ...(asset.layout.playerUiDefaults ?? {}) });
      setGameAsset({
        ...asset,
        layout: {
          ...asset.layout,
          playerUiDefaults: nextDefaults,
        },
      });
    },
    [tableLayoutState.asset]
  );

  const resetPlayerUiDefaults = useCallback(() => {
    setPlayerUiDefaults(() => ({}));
  }, [setPlayerUiDefaults]);

  const setSelectedSeat = useCallback((seatId: number | null) => {
    tableLayoutStore.setSelectedSeat(seatId);
  }, []);

  const setHudWingControl = useCallback(
    (side: 'leftWing' | 'rightWing', field: keyof HudWingConfig, value: number) => {
      updateHudControls((current) => {
        const nextWing = {
          ...current[side],
          [field]: value,
        };

        if (lockWings && field !== 'x') {
          const otherSide = side === 'leftWing' ? 'rightWing' : 'leftWing';

          return {
            ...current,
            [side]: nextWing,
            [otherSide]: {
              ...current[otherSide],
              [field]: value,
            },
          };
        }

        return {
          ...current,
          [side]: nextWing,
        };
      });
    },
    [lockWings, updateHudControls]
  );

  const setSharedWingControl = useCallback(
    (field: keyof HudWingConfig, value: number) => {
      updateHudControls((current) => ({
        ...current,
        leftWing: {
          ...current.leftWing,
          [field]: value,
        },
        rightWing: {
          ...current.rightWing,
          [field]: value,
        },
      }));
    },
    [updateHudControls]
  );

  const toggleWingLock = useCallback(() => {
    setLockWings((current) => {
      const next = !current;
      if (next) {
        setHudControls((state) => ({
          ...state,
          rightWing: {
            ...state.rightWing,
            y: state.leftWing.y,
            width: state.leftWing.width,
            height: state.leftWing.height,
            topRadius: state.leftWing.topRadius,
          },
        }));
      }

      return next;
    });
  }, []);

  const setHudClampControl = useCallback((field: keyof HudClampConfig, value: number | string) => {
    updateHudControls((current) => ({
      ...current,
      clamp: {
        ...current.clamp,
        [field]: value,
      },
    }));
  }, [updateHudControls]);

  const setHudWingStyleControl = useCallback((field: keyof HudWingStyleConfig, value: number | string) => {
    updateHudControls((current) => ({
      ...current,
      wingStyle: {
        ...current.wingStyle,
        [field]: value,
      },
    }));
  }, [updateHudControls]);

  const setHudDomeControl = useCallback((field: keyof HudDomeConfig, value: number | string) => {
    updateHudControls((current) => ({
      ...current,
      dome: {
        ...current.dome,
        [field]: value,
      },
    }));
  }, [updateHudControls]);

  const setHudButtonControl = useCallback((field: keyof HudButtonConfig, value: number | string) => {
    updateHudControls((current) => ({
      ...current,
      button: {
        ...current.button,
        [field]: value,
      },
    }));
  }, [updateHudControls]);

  const setHudButtonScale = useCallback((value: number) => {
    updateHudControls((current) => ({
      ...current,
      buttonScale: value,
    }));
  }, [updateHudControls]);

  const setHudButtonCount = useCallback((value: number) => {
    updateHudControls((current) => ({
      ...current,
      buttonCount: value,
    }));
  }, [updateHudControls]);

  const setHudButtonVariantControl = useCallback(
    (index: number, field: keyof HudButtonConfig, value: number | string) => {
      updateHudControls((current) => {
        const nextVariants = [...current.buttonVariants];
        const currentVariant: HudButtonVariantConfig = nextVariants[index] ?? { linked: true, overrides: {} };
        nextVariants[index] = {
          linked: false,
          overrides: {
            ...currentVariant.overrides,
            [field]: value,
          },
        };

        return {
          ...current,
          buttonVariants: nextVariants,
        };
      });
    },
    [updateHudControls]
  );

  const setHudButtonVariantLink = useCallback(
    (index: number, linked: boolean) => {
      updateHudControls((current) => {
        const nextVariants = [...current.buttonVariants];
        const currentVariant: HudButtonVariantConfig = nextVariants[index] ?? { linked: true, overrides: {} };
        nextVariants[index] = linked
          ? { linked: true, overrides: {} }
          : {
              linked: false,
              overrides: {
                ...current.button,
                ...currentVariant.overrides,
              },
            };

        return {
          ...current,
          buttonVariants: nextVariants,
        };
      });
    },
    [updateHudControls]
  );

  const applyMasterButtonToAll = useCallback(() => {
    updateHudControls((current) => ({
      ...current,
      buttonVariants: Array.from({ length: 6 }, () => ({
        linked: true,
        overrides: {},
      })),
    }));
  }, [updateHudControls]);

  const setHudButtonLabel = useCallback(
    (index: number, value: string) => {
      updateHudControls((current) => {
        const nextLabels = [...current.buttonLabels];
        nextLabels[index] = value;
        return {
          ...current,
          buttonLabels: nextLabels,
        };
      });
    },
    [updateHudControls]
  );

  const handleHomeClick = useCallback(() => {
    navigate(buildHomePath());
  }, [navigate]);

  const measureHudAnchor = useCallback(() => {
    if (!layerVisibility.hud) {
      setHudAnchor(null);
      return;
    }

    const elem = hudCenterRef.current;
    if (!elem) {
      setHudAnchor(null);
      return;
    }

    const rect = elem.getBoundingClientRect();
    setHudAnchor({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: rect.width / 2,
    });
  }, [layerVisibility.hud]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayerVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const handLayout = useMemo(() => {
    if (!hudAnchor) {
      return null;
    }

    const cardWidth = Math.round(Math.max(30, Math.min(hudAnchor.radius * cardControls.cardWidthScale, 116)));
    const cardHeight = Math.round(cardWidth * 1.42);
    const orbitRadius = Math.max(hudAnchor.radius * cardControls.radiusScale + cardControls.radiusOffset, 10);

    return {
      cardWidth,
      cardHeight,
      orbitRadius,
      minArc: cardControls.arcMin,
      maxArc: cardControls.arcMax,
      cardCount: cardControls.cardCount,
      minCardCount: cardControls.minCardCount,
      maxCardCount: cardControls.maxCardCount,
      fanTilt: cardControls.fanTilt,
      centerOffsetX: cardControls.centerOffsetX,
      centerOffsetY: cardControls.centerOffsetY,
      disableViewportScale: cardControls.disableViewportScale,
    };
  }, [
    cardControls.arcMax,
    cardControls.arcMin,
    cardControls.cardCount,
    cardControls.cardWidthScale,
    cardControls.centerOffsetX,
    cardControls.centerOffsetY,
    cardControls.disableViewportScale,
    cardControls.fanTilt,
    cardControls.maxCardCount,
    cardControls.minCardCount,
    cardControls.radiusOffset,
    cardControls.radiusScale,
    hudAnchor,
  ]);

  useSolanaBridge();

  useEffect(() => {
    measureHudAnchor();
  }, [hudControls, layerVisibility.hud, measureHudAnchor]);

  useEffect(() => {
    window.addEventListener('resize', measureHudAnchor);
    return () => window.removeEventListener('resize', measureHudAnchor);
  }, [measureHudAnchor]);

  useEffect(() => {
    const hideLoading = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hideLoading?.();
  }, []);

  const layerClassName = (key: LayerKey) =>
    `game-screen__layer-item game-screen__layer-item--${key}${layerVisibility[key] ? '' : ' game-screen__layer-item--hidden'}`;

  return (
    <GameModeProvider gameModeId="claim">
      <div className="game-screen">
        <div
          className={layerClassName('background')}
          aria-hidden={!layerVisibility.background}
        >
          <GameBackground
            floatScale={cardVisualControls.floatScale}
          />
        </div>

        <div className="game-screen__shell">
          <div
            className={`${layerClassName('header')} game-screen__layer-item--chrome`}
            aria-hidden={!layerVisibility.header}
          >
            <GameHeader {...headerProps} onHomeClick={handleHomeClick} />
          </div>

          <main className="game-screen__stage" aria-label="Card game template stage">
            <div
              className={`${layerClassName('table')} game-screen__stage-layer game-screen__stage-layer--table`}
              aria-hidden={!layerVisibility.table}
            >
              <CenterTableSvg />
            </div>

            <div
              className={`${layerClassName('seats')} game-screen__stage-layer game-screen__stage-layer--seats`}
              aria-hidden={!layerVisibility.seats}
            >
              <PlayersOnTable />
            </div>

            <div
              className={`${layerClassName('hud')} game-screen__stage-layer game-screen__stage-layer--hud`}
              aria-hidden={!layerVisibility.hud}
            >
              <GameHUD ref={hudCenterRef} controls={hudControls} showButtonGuides={showHudButtonGuides}>
                {layerVisibility.cards ? (
                  <CardInHand
                    position="fixed"
                    anchorPoint={hudAnchor ?? undefined}
                    radius={handLayout?.orbitRadius}
                    cardWidth={handLayout?.cardWidth}
                    cardHeight={handLayout?.cardHeight}
                    minArc={handLayout?.minArc}
                    maxArc={handLayout?.maxArc}
                    cardCount={handLayout?.cardCount}
                    minCardCount={handLayout?.minCardCount}
                    maxCardCount={handLayout?.maxCardCount}
                    fanTilt={handLayout?.fanTilt}
                    centerOffsetX={handLayout?.centerOffsetX}
                    centerOffsetY={handLayout?.centerOffsetY}
                    disableViewportScale={handLayout?.disableViewportScale ?? true}
                    zIndex={120}
                  />
                ) : null}
              </GameHUD>
            </div>

            <div className={`${layerClassName('tools')} game-screen__stage-layer game-screen__stage-layer--tools`} aria-hidden={!layerVisibility.tools} />
          </main>

          <div
            className={`${layerClassName('footer')} game-screen__layer-item--chrome`}
            aria-hidden={!layerVisibility.footer}
          >
            <AppFooter />
          </div>
        </div>
        <button
          type="button"
          className="game-screen__editor-launch"
          onClick={() => setShowHudButtonEditor(true)}
        >
          Layers
        </button>

        <HudButtonEditorModal
          open={showHudButtonEditor}
          initialWorkspaceSection="layerSplit"
          activeIndex={hudButtonEditorTab}
          master={hudControls.button}
          controls={hudControls}
          buttonScale={hudControls.buttonScale}
          buttonCount={hudControls.buttonCount}
          buttonLabels={hudControls.buttonLabels}
          buttonVariants={hudControls.buttonVariants}
          buttonLayoutCopyState={buttonLayoutCopyState}
          showButtonGuides={showHudButtonGuides}
          layerVisibility={layerVisibility}
          cardControls={cardControls}
          cardVisualControls={cardVisualControls}
          tableLayoutState={tableLayoutState}
          lockWings={lockWings}
          onClose={() => setShowHudButtonEditor(false)}
          onSelectTab={setHudButtonEditorTab}
          onChangeButtonScale={setHudButtonScale}
          onChangeButtonCount={setHudButtonCount}
          onToggleLayer={toggleLayer}
          onResetLayerVisibility={() => setLayerVisibility(DEFAULT_LAYER_VISIBILITY)}
          onHideAllLayers={() =>
            setLayerVisibility({
              background: false,
              header: false,
              table: false,
              seats: false,
              cards: false,
              hud: false,
              tools: false,
              footer: false,
            })
          }
          onUpdateHudControls={setHudControls}
          onUndoHudControls={undoHudControls}
          onCopyHudControls={copyHudControls}
          onResetHudControls={() => setHudControls({ ...DEFAULT_HUD_ARTWORK_CONTROLS })}
          onToggleWingLock={toggleWingLock}
          onSetHudWingControl={setHudWingControl}
          onSetSharedWingControl={setSharedWingControl}
          onSetHudClampControl={setHudClampControl}
          onSetHudWingStyleControl={setHudWingStyleControl}
          onSetHudDomeControl={setHudDomeControl}
          onSetCardControls={setCardControls}
          onResetCardControls={() => setCardControls({ ...DEFAULT_CARD_CONTROLS })}
          onSetCardVisualControls={setCardVisualControls}
          onResetTablePreset={resetTablePreset}
          onSetTableShapeField={setTableShapeField}
          onSetPlayerCount={(value) => tableLayoutStore.setPlayerCount(value)}
          onSetSeatField={setTableSeatField}
          onSelectSeat={setSelectedSeat}
          onSetPlayerUiDefaults={setPlayerUiDefaults}
          onResetPlayerUiDefaults={resetPlayerUiDefaults}
          onChangeMaster={setHudButtonControl}
          onChangeVariant={setHudButtonVariantControl}
          onToggleVariantLink={setHudButtonVariantLink}
          onApplyMasterToAll={applyMasterButtonToAll}
          onResetButtons={resetButtons}
          onCopyButtonLayout={copyButtonLayout}
          onSetLabel={setHudButtonLabel}
          onToggleButtonGuides={() => setShowHudButtonGuides((current) => !current)}
        />
      </div>
    </GameModeProvider>
  );
};

export default GameScreen;
