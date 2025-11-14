import React, { useEffect, useRef, useState } from 'react';
import { GameHeader } from '@ui/components/Header/GameHeader';
import { GameFooter } from '@ui/components/Footer/GameFooter';
import { useAuth } from '@providers';
import { useSolanaBridge } from '@services/solana/useSolanaBridge';
import GameBackground from './GameBackground';
import GameHUD from './GameHUD';
import CardInHand from './CardInHand';
import CenterTableSvg from './CenterTableSvg';
import PlayersOnTable from './PlayersOnTable';
import './GameScreen.css';
import { GameModeProvider, getGameModeConfig } from '@ui/gameMode';

const DEFAULT_GAME_MODE = getGameModeConfig('claim');

export const GameScreen: React.FC = () => {
  const { user, logout } = useAuth();
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
    <GameModeProvider config={DEFAULT_GAME_MODE}>
    <div className="game-screen">
      <GameBackground />

      <div className="game-screen__layer">
        <GameHeader user={user} onLogout={logout} />

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

        <GameFooter />
      </div>
    </div>
    </GameModeProvider>
  );
};

export default GameScreen;

