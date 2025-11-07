import React from 'react';
import { GameHeader } from '../Header/GameHeader';
import { GameFooter } from '../Footer/GameFooter';
import { useAuth } from '../../../providers/AuthProvider';
import GameBackground from './GameBackground';
import './GameScreen.css';

export const GameScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="game-screen">
      <GameBackground />

      <div className="game-screen__layer">
        <GameHeader user={user} onLogout={logout} />

        <main className="game-screen__content">
        </main>

        <GameFooter />
      </div>
    </div>
  );
};

export default GameScreen;

