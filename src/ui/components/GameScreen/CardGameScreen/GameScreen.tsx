import React, { useEffect, useRef, useState } from 'react';
import { GameHeader } from '@ocentra/core-ui';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { useSolanaBridge } from '@/adapters/solana/useSolanaBridge';
import GameBackground from './CardGameComponents/GameBackground';
import GameHUD from './GameHUD';
import CardInHand from './CardGameComponents/CardInHand';
import CenterTableSvg from './CardGameComponents/CenterTableSvg';
import PlayersOnTable from './PlayersOnTable';
import './GameScreen.css';
import { GameModeProvider } from '@/ui/gameMode/GameModeContext';

export const GameScreen: React.FC = () => {
  const headerProps = useCoreUIHeaderProps();
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  
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

  return (
    <GameModeProvider gameModeId="claim">
    <div className="game-screen">
      <GameBackground />

      <div className="game-screen__layer">
        <GameHeader {...headerProps} />

        <main className="game-screen__content">
          <CenterTableSvg />
            <PlayersOnTable />
          <CardInHand
            position="fixed"
            anchorPoint={hudAnchor ?? undefined}
            zIndex={120}
          />

          <GameHUD ref={hudCenterRef} />
        </main>

        <AppFooter />
      </div>
    </div>
    </GameModeProvider>
  );
};

export default GameScreen;

