import React from 'react';
import './LoadingScreen.css';

interface GameLoadingScreenProps {
  isBackgroundReady: boolean;
}

export function GameLoadingScreen({ isBackgroundReady }: GameLoadingScreenProps) {
  return (
    <div 
      className={`game-loading-screen ${isBackgroundReady ? 'fade-out' : ''}`}
    >
      <div className="loading-spinner"></div>
      <p className="loading-message">Initializing game...</p>
      <div className="loading-title">CLAIM</div>
    </div>
  );
}

