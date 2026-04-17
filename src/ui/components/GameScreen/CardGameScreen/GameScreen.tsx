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

export const GameScreen: React.FC = () => {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [showCardControls, setShowCardControls] = useState(true);
  const [cardControls, setCardControls] = useState({
    cardCount: 13,
    radiusScale: 0.41,
    cardWidthScale: 0.38,
    arcMin: 34,
    arcMax: 149,
  });

  const handleHomeClick = useCallback(() => {
    navigate(buildHomePath());
  }, [navigate]);

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
  
  // Initialize Solana bridge for multiplayer
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

  return (
    <GameModeProvider gameModeId="claim">
      <div className="game-screen">
        <GameBackground />

        <div className="game-screen__layer">
          <GameHeader {...headerProps} onHomeClick={handleHomeClick} />

          <main className="game-screen__content">
            <CenterTableSvg />
            <PlayersOnTable />
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

            <GameHUD ref={hudCenterRef} />

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
                  <span>Min Arc {cardControls.arcMin}°</span>
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
                  <span>Max Arc {cardControls.arcMax}°</span>
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
          </main>

          <AppFooter
            rightContent={(
              <button
                type="button"
                className="game-screen__card-controls-toggle"
                onClick={() => setShowCardControls((current) => !current)}
                aria-label={showCardControls ? 'Hide temp card controls' : 'Show temp card controls'}
              >
                {showCardControls ? 'Dev' : 'Card'}
              </button>
            )}
          />
        </div>
      </div>
    </GameModeProvider>
  );
};

export default GameScreen;
