import React, { useEffect, useRef, useState } from 'react';
import { GameHeader } from '../Header/GameHeader';
import { GameFooter } from '../Footer/GameFooter';
import { useAuth } from '../../../providers/AuthProvider';
import GameBackground from './GameBackground';
import GameHUD from './GameHUD';
import CardInHand from './CardInHand';
import CenterTableSvg from './CenterTableSvg';
import PlayersOnTable from './PlayersOnTable';
import './GameScreen.css';


export const GameScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);

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
    <div className="game-screen">
      <GameBackground />

      <div className="game-screen__layer">
        <GameHeader user={user} onLogout={logout} />

        <main className="game-screen__content">
          <CenterTableSvg />
         {/* <PlayersOnTable /> */}
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
  );
};

export default GameScreen;

