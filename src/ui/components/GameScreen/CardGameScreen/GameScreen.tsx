import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import './GameScreen.css';
import { GameModeProvider } from '@/ui/gameMode/GameModeContext';
import { DEFAULT_HUD_ARTWORK_CONTROLS, type HudArtworkControls } from './HudArtwork.types';

type LayerKey = 'background' | 'header' | 'table' | 'seats' | 'cards' | 'hud' | 'tools' | 'footer';
type HudWingConfig = HudArtworkControls['leftWing'];
type HudClampConfig = HudArtworkControls['clamp'];
type HudWingStyleConfig = HudArtworkControls['wingStyle'];
type HudDomeConfig = HudArtworkControls['dome'];

const LAYER_OPTIONS: Array<{ key: LayerKey; label: string }> = [
  { key: 'background', label: 'Background' },
  { key: 'header', label: 'Header' },
  { key: 'table', label: 'Table' },
  { key: 'seats', label: 'Seats' },
  { key: 'cards', label: 'Cards' },
  { key: 'hud', label: 'HUD' },
  { key: 'tools', label: 'Tools' },
  { key: 'footer', label: 'Footer' },
];
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

export const GameScreen: React.FC = () => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [showCardControls, setShowCardControls] = useState(false);
  const [showLayerControls, setShowLayerControls] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYER_VISIBILITY);
  const [cardControls, setCardControls] = useState({
    cardCount: 13,
    radiusScale: 0.41,
    cardWidthScale: 0.38,
    arcMin: 34,
    arcMax: 149,
  });
  const [cardVisualControls, setCardVisualControls] = useState({
    floatScale: 3,
  });
  const [hudControls, setHudControls] = useState<HudArtworkControls>({ ...DEFAULT_HUD_ARTWORK_CONTROLS });
  const [hudUndoStack, setHudUndoStack] = useState<HudArtworkControls[]>([]);
  const [lockWings, setLockWings] = useState(true);
  const [hudCopyState, setHudCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const hudCopyResetRef = useRef<number | null>(null);

  const updateHudControls = useCallback(
    (updater: (current: HudArtworkControls) => HudArtworkControls) => {
      setHudControls((current) => {
        const next = updater(current);
        setHudUndoStack((history) => [...history, current]);
        return next;
      });
    },
    []
  );

  const undoHudControls = useCallback(() => {
    setHudUndoStack((history) => {
      if (history.length === 0) {
        return history;
      }

      const previous = history[history.length - 1];
      setHudControls(previous);
      return history.slice(0, -1);
    });
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

      setHudCopyState('copied');
      if (hudCopyResetRef.current !== null) {
        window.clearTimeout(hudCopyResetRef.current);
      }
      hudCopyResetRef.current = window.setTimeout(() => {
        setHudCopyState('idle');
        hudCopyResetRef.current = null;
      }, 1500);
    } catch {
      setHudCopyState('failed');
      if (hudCopyResetRef.current !== null) {
        window.clearTimeout(hudCopyResetRef.current);
      }
      hudCopyResetRef.current = window.setTimeout(() => {
        setHudCopyState('idle');
        hudCopyResetRef.current = null;
      }, 1500);
    }
  }, [hudControls]);

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
    const orbitRadius = Math.max(hudAnchor.radius * cardControls.radiusScale, 10);

    return {
      cardWidth,
      cardHeight,
      orbitRadius,
      minArc: cardControls.arcMin,
      maxArc: cardControls.arcMax,
      cardCount: cardControls.cardCount,
    };
  }, [cardControls.arcMax, cardControls.arcMin, cardControls.cardCount, cardControls.cardWidthScale, cardControls.radiusScale, hudAnchor]);

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

  useEffect(() => () => {
    if (hudCopyResetRef.current !== null) {
      window.clearTimeout(hudCopyResetRef.current);
    }
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
              <GameHUD ref={hudCenterRef} controls={hudControls}>
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
                    disableViewportScale
                    zIndex={120}
                  />
                ) : null}
              </GameHUD>
            </div>

            <div
              className={`${layerClassName('tools')} game-screen__stage-layer game-screen__stage-layer--tools`}
              aria-hidden={!layerVisibility.tools}
            >
              {showCardControls && (
                <aside className="game-screen__card-controls">
                  <div className="game-screen__card-controls-header">
                    <strong>Temp Card Controls</strong>
                    <button type="button" onClick={() => setShowCardControls(false)}>
                      Hide
                    </button>
                  </div>

                  <label className="game-screen__control">
                    <span>Card Count {cardControls.cardCount}</span>
                    <input
                      type="number"
                      min={3}
                      max={13}
                      step={1}
                      value={cardControls.cardCount}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, cardCount: Number(event.target.value) }))
                      }
                    />
                    <input
                      type="range"
                      min={3}
                      max={13}
                      step={1}
                      value={cardControls.cardCount}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, cardCount: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label className="game-screen__control">
                    <span>Radius Scale {cardControls.radiusScale.toFixed(2)}</span>
                    <input
                      type="number"
                      min={0.15}
                      max={1.15}
                      step={0.01}
                      value={cardControls.radiusScale}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, radiusScale: Number(event.target.value) }))
                      }
                    />
                    <input
                      type="range"
                      min={0.15}
                      max={1.15}
                      step={0.01}
                      value={cardControls.radiusScale}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, radiusScale: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label className="game-screen__control">
                    <span>Card Width Scale {cardControls.cardWidthScale.toFixed(2)}</span>
                    <input
                      type="number"
                      min={0.28}
                      max={0.6}
                      step={0.01}
                      value={cardControls.cardWidthScale}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, cardWidthScale: Number(event.target.value) }))
                      }
                    />
                    <input
                      type="range"
                      min={0.28}
                      max={0.6}
                      step={0.01}
                      value={cardControls.cardWidthScale}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, cardWidthScale: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label className="game-screen__control">
                    <span>Min Arc {cardControls.arcMin} deg</span>
                    <input
                      type="number"
                      min={20}
                      max={90}
                      step={1}
                      value={cardControls.arcMin}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, arcMin: Number(event.target.value) }))
                      }
                    />
                    <input
                      type="range"
                      min={20}
                      max={90}
                      step={1}
                      value={cardControls.arcMin}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, arcMin: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label className="game-screen__control">
                    <span>Max Arc {cardControls.arcMax} deg</span>
                    <input
                      type="number"
                      min={90}
                      max={170}
                      step={1}
                      value={cardControls.arcMax}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, arcMax: Number(event.target.value) }))
                      }
                    />
                    <input
                      type="range"
                      min={90}
                      max={170}
                      step={1}
                      value={cardControls.arcMax}
                      onChange={(event) =>
                        setCardControls((current) => ({ ...current, arcMax: Number(event.target.value) }))
                      }
                    />
                  </label>
                </aside>
              )}
            </div>
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
          className="game-screen__layers-toggle"
          onClick={() => setShowLayerControls((current) => !current)}
          aria-label={showLayerControls ? 'Hide layer controls' : 'Show layer controls'}
        >
          Layers
        </button>

        {showLayerControls && (
          <aside className="game-screen__layers-panel">
            <div className="game-screen__layers-panel-header">
              <strong>Layer Split</strong>
              <button type="button" onClick={() => setShowLayerControls(false)}>
                Hide
              </button>
            </div>

            <div className="game-screen__layers-panel-actions">
              <button type="button" onClick={() => setLayerVisibility(DEFAULT_LAYER_VISIBILITY)}>
                Reset
              </button>
              <button
                type="button"
                onClick={() =>
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
              >
                Hide all
              </button>
            </div>

            <div className="game-screen__layers-panel-section">
              <strong>HUD Tuning</strong>
              <div className="game-screen__layers-panel-actions">
                <button type="button" onClick={undoHudControls} disabled={hudUndoStack.length === 0}>
                  Undo
                </button>
                <button type="button" onClick={copyHudControls}>
                  {hudCopyState === 'copied' ? 'Copied HUD' : hudCopyState === 'failed' ? 'Copy Failed' : 'Copy HUD'}
                </button>
                <button
                  type="button"
                  onClick={() => updateHudControls(() => ({ ...DEFAULT_HUD_ARTWORK_CONTROLS }))}
                >
                  Reset HUD
                </button>
              </div>

              <details className="game-screen__layers-panel-group" open>
                <summary>Overall</summary>
                <div className="game-screen__layers-panel-grid">
                  <label className="game-screen__layers-panel-field">
                    <span>Overall X {hudControls.hudOffsetX}px</span>
                    <input
                      type="number"
                      min={-320}
                      max={320}
                      step={1}
                      value={hudControls.hudOffsetX}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          hudOffsetX: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={-320}
                      max={320}
                      step={1}
                      value={hudControls.hudOffsetX}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          hudOffsetX: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Overall Y {hudControls.hudOffsetY}px</span>
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={hudControls.hudOffsetY}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          hudOffsetY: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={hudControls.hudOffsetY}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          hudOffsetY: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Canvas Width {hudControls.width}px</span>
                    <input
                      type="number"
                      min={720}
                      max={1200}
                      step={10}
                      value={hudControls.width}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          width: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={720}
                      max={1200}
                      step={10}
                      value={hudControls.width}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          width: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Canvas Height {hudControls.height}px</span>
                    <input
                      type="number"
                      min={240}
                      max={520}
                      step={5}
                      value={hudControls.height}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          height: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={240}
                      max={520}
                      step={5}
                      value={hudControls.height}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          height: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Overall Scale {hudControls.overallScale.toFixed(2)}x</span>
                    <input
                      type="number"
                      min={0.5}
                      max={2}
                      step={0.01}
                      value={hudControls.overallScale}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          overallScale: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.01}
                      value={hudControls.overallScale}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          overallScale: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              </details>

              <details className="game-screen__layers-panel-group" open>
                <summary>Wings</summary>
                <div className="game-screen__layers-panel-actions">
                  <button type="button" onClick={toggleWingLock}>
                    {lockWings ? 'Unlock Wings' : 'Lock Wings'}
                  </button>
                </div>

                <div className="game-screen__layers-panel-grid">
                  <label className="game-screen__layers-panel-field">
                    <span>Left X {hudControls.leftWing.x}px</span>
                    <input
                      type="number"
                      min={-240}
                      max={520}
                      step={1}
                      value={hudControls.leftWing.x}
                      onChange={(event) => setHudWingControl('leftWing', 'x', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={-240}
                      max={520}
                      step={1}
                      value={hudControls.leftWing.x}
                      onChange={(event) => setHudWingControl('leftWing', 'x', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Right X {hudControls.rightWing.x}px</span>
                    <input
                      type="number"
                      min={-240}
                      max={1120}
                      step={1}
                      value={hudControls.rightWing.x}
                      onChange={(event) => setHudWingControl('rightWing', 'x', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={-240}
                      max={1120}
                      step={1}
                      value={hudControls.rightWing.x}
                      onChange={(event) => setHudWingControl('rightWing', 'x', Number(event.target.value))}
                    />
                  </label>
                </div>

                {lockWings ? (
                  <div className="game-screen__layers-panel-grid">
                  <label className="game-screen__layers-panel-field">
                    <span>Wing Y {hudControls.leftWing.y}px</span>
                    <input
                      type="number"
                      min={120}
                      max={320}
                      step={1}
                      value={hudControls.leftWing.y}
                      onChange={(event) => setSharedWingControl('y', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={120}
                        max={320}
                        step={1}
                        value={hudControls.leftWing.y}
                        onChange={(event) => setSharedWingControl('y', Number(event.target.value))}
                      />
                    </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Width {hudControls.leftWing.width}px</span>
                    <input
                      type="number"
                      min={240}
                      max={620}
                      step={1}
                      value={hudControls.leftWing.width}
                      onChange={(event) => setSharedWingControl('width', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={240}
                        max={620}
                        step={1}
                        value={hudControls.leftWing.width}
                        onChange={(event) => setSharedWingControl('width', Number(event.target.value))}
                      />
                    </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Height {hudControls.leftWing.height}px</span>
                    <input
                      type="number"
                      min={60}
                      max={220}
                      step={1}
                      value={hudControls.leftWing.height}
                      onChange={(event) => setSharedWingControl('height', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={60}
                        max={220}
                        step={1}
                        value={hudControls.leftWing.height}
                        onChange={(event) => setSharedWingControl('height', Number(event.target.value))}
                      />
                    </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Top Radius {hudControls.leftWing.topRadius}px</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      step={1}
                      value={hudControls.leftWing.topRadius}
                      onChange={(event) => setSharedWingControl('topRadius', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                        max={80}
                        step={1}
                        value={hudControls.leftWing.topRadius}
                        onChange={(event) => setSharedWingControl('topRadius', Number(event.target.value))}
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="game-screen__layers-panel-grid">
                    <label className="game-screen__layers-panel-field">
                      <span>Left Y {hudControls.leftWing.y}px</span>
                      <input
                        type="number"
                        min={120}
                        max={320}
                        step={1}
                        value={hudControls.leftWing.y}
                        onChange={(event) => setHudWingControl('leftWing', 'y', Number(event.target.value))}
                      />
                      <input
                        type="range"
                        min={120}
                          max={320}
                          step={1}
                          value={hudControls.leftWing.y}
                          onChange={(event) => setHudWingControl('leftWing', 'y', Number(event.target.value))}
                        />
                      </label>

                    <label className="game-screen__layers-panel-field">
                      <span>Left Width {hudControls.leftWing.width}px</span>
                      <input
                        type="number"
                        min={240}
                        max={620}
                        step={1}
                        value={hudControls.leftWing.width}
                        onChange={(event) => setHudWingControl('leftWing', 'width', Number(event.target.value))}
                      />
                      <input
                        type="range"
                        min={240}
                          max={620}
                          step={1}
                          value={hudControls.leftWing.width}
                          onChange={(event) => setHudWingControl('leftWing', 'width', Number(event.target.value))}
                        />
                      </label>

                    <label className="game-screen__layers-panel-field">
                      <span>Left Height {hudControls.leftWing.height}px</span>
                      <input
                        type="number"
                        min={60}
                        max={220}
                        step={1}
                        value={hudControls.leftWing.height}
                        onChange={(event) => setHudWingControl('leftWing', 'height', Number(event.target.value))}
                      />
                      <input
                        type="range"
                        min={60}
                          max={220}
                          step={1}
                          value={hudControls.leftWing.height}
                          onChange={(event) => setHudWingControl('leftWing', 'height', Number(event.target.value))}
                        />
                      </label>

                    <label className="game-screen__layers-panel-field">
                      <span>Left Top Radius {hudControls.leftWing.topRadius}px</span>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        step={1}
                        value={hudControls.leftWing.topRadius}
                        onChange={(event) => setHudWingControl('leftWing', 'topRadius', Number(event.target.value))}
                      />
                      <input
                        type="range"
                        min={0}
                          max={80}
                          step={1}
                          value={hudControls.leftWing.topRadius}
                          onChange={(event) => setHudWingControl('leftWing', 'topRadius', Number(event.target.value))}
                        />
                      </label>
                    </div>

                    <div className="game-screen__layers-panel-grid">
                      <label className="game-screen__layers-panel-field">
                        <span>Right Y {hudControls.rightWing.y}px</span>
                        <input
                          type="number"
                          min={120}
                          max={320}
                          step={1}
                          value={hudControls.rightWing.y}
                          onChange={(event) => setHudWingControl('rightWing', 'y', Number(event.target.value))}
                        />
                        <input
                          type="range"
                          min={120}
                          max={320}
                          step={1}
                          value={hudControls.rightWing.y}
                          onChange={(event) => setHudWingControl('rightWing', 'y', Number(event.target.value))}
                        />
                      </label>

                      <label className="game-screen__layers-panel-field">
                        <span>Right Width {hudControls.rightWing.width}px</span>
                        <input
                          type="number"
                          min={240}
                          max={620}
                          step={1}
                          value={hudControls.rightWing.width}
                          onChange={(event) => setHudWingControl('rightWing', 'width', Number(event.target.value))}
                        />
                        <input
                          type="range"
                          min={240}
                          max={620}
                          step={1}
                          value={hudControls.rightWing.width}
                          onChange={(event) => setHudWingControl('rightWing', 'width', Number(event.target.value))}
                        />
                      </label>

                      <label className="game-screen__layers-panel-field">
                        <span>Right Height {hudControls.rightWing.height}px</span>
                        <input
                          type="number"
                          min={60}
                          max={220}
                          step={1}
                          value={hudControls.rightWing.height}
                          onChange={(event) => setHudWingControl('rightWing', 'height', Number(event.target.value))}
                        />
                        <input
                          type="range"
                          min={60}
                          max={220}
                          step={1}
                          value={hudControls.rightWing.height}
                          onChange={(event) => setHudWingControl('rightWing', 'height', Number(event.target.value))}
                        />
                      </label>

                      <label className="game-screen__layers-panel-field">
                        <span>Right Top Radius {hudControls.rightWing.topRadius}px</span>
                        <input
                          type="number"
                          min={0}
                          max={80}
                          step={1}
                          value={hudControls.rightWing.topRadius}
                          onChange={(event) => setHudWingControl('rightWing', 'topRadius', Number(event.target.value))}
                        />
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={hudControls.rightWing.topRadius}
                          onChange={(event) => setHudWingControl('rightWing', 'topRadius', Number(event.target.value))}
                        />
                      </label>
                    </div>
                  </>
                )}
              </details>

              <details className="game-screen__layers-panel-group">
                <summary>Dome</summary>
                <div className="game-screen__layers-panel-grid">
                  <label className="game-screen__layers-panel-field">
                    <span>X {hudControls.dome.cx}px</span>
                    <input
                      type="number"
                      min={160}
                      max={760}
                      step={1}
                      value={hudControls.dome.cx}
                      onChange={(event) => setHudDomeControl('cx', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={160}
                      max={760}
                      step={1}
                      value={hudControls.dome.cx}
                      onChange={(event) => setHudDomeControl('cx', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Y {hudControls.dome.cy}px</span>
                    <input
                      type="number"
                      min={160}
                      max={420}
                      step={1}
                      value={hudControls.dome.cy}
                      onChange={(event) => setHudDomeControl('cy', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={160}
                      max={420}
                      step={1}
                      value={hudControls.dome.cy}
                      onChange={(event) => setHudDomeControl('cy', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Radius {hudControls.dome.radius}px</span>
                    <input
                      type="number"
                      min={80}
                      max={320}
                      step={1}
                      value={hudControls.dome.radius}
                      onChange={(event) => setHudDomeControl('radius', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={80}
                      max={320}
                      step={1}
                      value={hudControls.dome.radius}
                      onChange={(event) => setHudDomeControl('radius', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Edge {hudControls.dome.edgeWidth}px</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      step={1}
                      value={hudControls.dome.edgeWidth}
                      onChange={(event) => setHudDomeControl('edgeWidth', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={hudControls.dome.edgeWidth}
                      onChange={(event) => setHudDomeControl('edgeWidth', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Glow {hudControls.dome.glowWidth}px</span>
                    <input
                      type="number"
                      min={0}
                      max={28}
                      step={1}
                      value={hudControls.dome.glowWidth}
                      onChange={(event) => setHudDomeControl('glowWidth', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                      max={28}
                      step={1}
                      value={hudControls.dome.glowWidth}
                      onChange={(event) => setHudDomeControl('glowWidth', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Glow Opacity {hudControls.dome.glowOpacity.toFixed(2)}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={hudControls.dome.glowOpacity}
                      onChange={(event) => setHudDomeControl('glowOpacity', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={hudControls.dome.glowOpacity}
                      onChange={(event) => setHudDomeControl('glowOpacity', Number(event.target.value))}
                    />
                  </label>
                </div>
              </details>

              <details className="game-screen__layers-panel-group">
                <summary>Style</summary>
                <div className="game-screen__layers-panel-grid">
                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Width {hudControls.clamp.width}px</span>
                    <input
                      type="number"
                      min={8}
                      max={40}
                      step={1}
                      value={hudControls.clamp.width}
                      onChange={(event) => setHudClampControl('width', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={8}
                      max={40}
                      step={1}
                      value={hudControls.clamp.width}
                      onChange={(event) => setHudClampControl('width', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Height {hudControls.clamp.height}px</span>
                    <input
                      type="number"
                      min={40}
                      max={120}
                      step={1}
                      value={hudControls.clamp.height}
                      onChange={(event) => setHudClampControl('height', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={40}
                      max={120}
                      step={1}
                      value={hudControls.clamp.height}
                      onChange={(event) => setHudClampControl('height', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Radius {hudControls.clamp.rightRadius}px</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={hudControls.clamp.rightRadius}
                      onChange={(event) => setHudClampControl('rightRadius', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={hudControls.clamp.rightRadius}
                      onChange={(event) => setHudClampControl('rightRadius', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Glass Opacity {hudControls.panelGlassOpacity.toFixed(2)}</span>
                    <input
                      type="number"
                      min={0}
                      max={0.2}
                      step={0.01}
                      value={hudControls.panelGlassOpacity}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          panelGlassOpacity: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={0.2}
                      step={0.01}
                      value={hudControls.panelGlassOpacity}
                      onChange={(event) =>
                        updateHudControls((current) => ({
                          ...current,
                          panelGlassOpacity: Number(event.target.value),
                        }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Edge {hudControls.wingStyle.edgeWidth}px</span>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      step={1}
                      value={hudControls.wingStyle.edgeWidth}
                      onChange={(event) => setHudWingStyleControl('edgeWidth', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={hudControls.wingStyle.edgeWidth}
                      onChange={(event) => setHudWingStyleControl('edgeWidth', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Glow {hudControls.wingStyle.glowWidth}px</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      value={hudControls.wingStyle.glowWidth}
                      onChange={(event) => setHudWingStyleControl('glowWidth', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={hudControls.wingStyle.glowWidth}
                      onChange={(event) => setHudWingStyleControl('glowWidth', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Glow Opacity {hudControls.wingStyle.glowOpacity.toFixed(2)}</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={hudControls.wingStyle.glowOpacity}
                      onChange={(event) => setHudWingStyleControl('glowOpacity', Number(event.target.value))}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={hudControls.wingStyle.glowOpacity}
                      onChange={(event) => setHudWingStyleControl('glowOpacity', Number(event.target.value))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Panel Top</span>
                    <input
                      type="color"
                      value={hudControls.panelTop}
                      onChange={(event) => updateHudControls((current) => ({ ...current, panelTop: event.target.value }))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Panel Mid</span>
                    <input
                      type="color"
                      value={hudControls.panelMid}
                      onChange={(event) => updateHudControls((current) => ({ ...current, panelMid: event.target.value }))}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Panel Bottom</span>
                    <input
                      type="color"
                      value={hudControls.panelBottom}
                      onChange={(event) =>
                        updateHudControls((current) => ({ ...current, panelBottom: event.target.value }))
                      }
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Edge Color</span>
                    <input
                      type="color"
                      value={hudControls.wingStyle.edgeColor}
                      onChange={(event) => setHudWingStyleControl('edgeColor', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Wing Glow Color</span>
                    <input
                      type="color"
                      value={hudControls.wingStyle.glowColor}
                      onChange={(event) => setHudWingStyleControl('glowColor', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Gold Top</span>
                    <input
                      type="color"
                      value={hudControls.clamp.goldTop}
                      onChange={(event) => setHudClampControl('goldTop', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Gold Mid</span>
                    <input
                      type="color"
                      value={hudControls.clamp.goldMid}
                      onChange={(event) => setHudClampControl('goldMid', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Clamp Gold Bottom</span>
                    <input
                      type="color"
                      value={hudControls.clamp.goldBottom}
                      onChange={(event) => setHudClampControl('goldBottom', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Dome Edge</span>
                    <input
                      type="color"
                      value={hudControls.dome.edgeColor}
                      onChange={(event) => setHudDomeControl('edgeColor', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Dome Inner</span>
                    <input
                      type="color"
                      value={hudControls.dome.edgeInnerColor}
                      onChange={(event) => setHudDomeControl('edgeInnerColor', event.target.value)}
                    />
                  </label>

                  <label className="game-screen__layers-panel-field">
                    <span>Dome Glow Color</span>
                    <input
                      type="color"
                      value={hudControls.dome.glowColor}
                      onChange={(event) => setHudDomeControl('glowColor', event.target.value)}
                    />
                  </label>
                </div>
              </details>
            </div>

            <div className="game-screen__layers-panel-section">
              <strong>HUD Buttons</strong>
              <div className="game-screen__layers-panel-actions">
                <button
                  type="button"
                  onClick={() =>
                    updateHudControls((current) => ({
                      ...current,
                      buttonCount: 6,
                      buttonScale: 1,
                      buttonLabels: ["A", "B", "C", "D", "E", "F"],
                    }))
                  }
                >
                  Reset Buttons
                </button>
              </div>

              <label className="game-screen__control">
                <span>Button Scale {hudControls.buttonScale.toFixed(2)}x</span>
                <input
                  type="number"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={hudControls.buttonScale}
                  onChange={(event) =>
                    updateHudControls((current) => ({
                      ...current,
                      buttonScale: Number(event.target.value),
                    }))
                  }
                />
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={hudControls.buttonScale}
                  onChange={(event) =>
                    updateHudControls((current) => ({
                      ...current,
                      buttonScale: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <label className="game-screen__control">
                <span>Button Count {hudControls.buttonCount}</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={1}
                  value={hudControls.buttonCount}
                  onChange={(event) =>
                    updateHudControls((current) => ({
                      ...current,
                      buttonCount: Number(event.target.value),
                    }))
                  }
                />
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={hudControls.buttonCount}
                  onChange={(event) =>
                    updateHudControls((current) => ({
                      ...current,
                      buttonCount: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <div className="game-screen__layers-panel-grid">
                {["A", "B", "C", "D", "E", "F"].map((slot, index) => (
                  <label key={slot} className="game-screen__layers-panel-field">
                    <span>{slot} Label</span>
                    <input
                      type="text"
                      value={hudControls.buttonLabels[index] ?? slot}
                      onChange={(event) =>
                        updateHudControls((current) => {
                          const nextLabels = [...current.buttonLabels];
                          nextLabels[index] = event.target.value;
                          return {
                            ...current,
                            buttonLabels: nextLabels,
                          };
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="game-screen__layers-panel-section">
              <strong>Card Visuals</strong>
              <label className="game-screen__layer-toggle">
                <span>Float Scale {cardVisualControls.floatScale.toFixed(2)}</span>
                <input
                  type="number"
                  min={0.25}
                  max={8}
                  step={0.25}
                  value={cardVisualControls.floatScale}
                  onChange={(event) =>
                    setCardVisualControls((current) => ({ ...current, floatScale: Number(event.target.value) }))
                  }
                />
                <input
                  type="range"
                  min={0.25}
                  max={8}
                  step={0.25}
                  value={cardVisualControls.floatScale}
                  onChange={(event) =>
                    setCardVisualControls((current) => ({ ...current, floatScale: Number(event.target.value) }))
                  }
                />
              </label>

            </div>

            <div className="game-screen__layers-panel-section">
              <strong>Card Fan</strong>
              <button
                type="button"
                className="game-screen__layers-panel-button"
                onClick={() => setShowCardControls((current) => !current)}
              >
                {showCardControls ? 'Hide temp card controls' : 'Show temp card controls'}
              </button>
            </div>

            {LAYER_OPTIONS.map((option) => (
              <label key={option.key} className="game-screen__layer-toggle">
                <input
                  type="checkbox"
                  checked={layerVisibility[option.key]}
                  onChange={() => toggleLayer(option.key)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </aside>
        )}
      </div>
    </GameModeProvider>
  );
};

export default GameScreen;
