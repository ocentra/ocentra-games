import React from 'react';
import type { UserProfile } from '../../../services/firebaseService';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function WelcomeScreen({ user, onLogout, onLogoutClick }: WelcomeScreenProps) {
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  return (
    <div className="welcome-container">
      <h1>Welcome to CLAIM</h1>
      {user && <p>Hello, {user.displayName}!</p>}
      <p>You are successfully logged in!</p>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
}

