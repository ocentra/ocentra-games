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

type LayerKey = 'background' | 'header' | 'table' | 'seats' | 'cards' | 'hud' | 'tools' | 'footer';

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

  const handleHomeClick = useCallback(() => {
    navigate(buildHomePath());
  }, [navigate]);

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

    const cardWidth = Math.round(Math.max(54, Math.min(hudAnchor.radius * cardControls.cardWidthScale, 116)));
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
    const measure = () => {
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
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
              <GameHUD ref={hudCenterRef}>
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
              <strong>Card Visuals</strong>
              <label className="game-screen__layer-toggle">
                <span>Float Scale {cardVisualControls.floatScale.toFixed(2)}</span>
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
