import { useState, useEffect } from 'react'
import type { UserProfile } from '@services';
import { EventBus } from '@/lib/eventing/EventBus'
import { ShowScreenEvent } from '@/lib/eventing/events/lobby'
import LoginDialog from './LoginDialog';
import { WelcomeScreen } from '@ui/components/Welcome/WelcomeScreen';
import { SettingsPage } from '@/ui/pages/Settings/SettingsPage'

interface AuthScreenProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  showLoginDialog: boolean;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  onFacebookLogin: () => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  onGuestLogin: () => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  onLogoutClick?: () => void;
  onTabSwitch?: () => void;
}

export function AuthScreen({
  isAuthenticated,
  user,
  showLoginDialog,
  onLogin,
  onSignUp,
  onFacebookLogin,
  onGoogleLogin,
  onGuestLogin,
  onLogout,
  onSendPasswordReset,
  onLogoutClick,
  onTabSwitch,
}: AuthScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'settings'>('welcome')

  useEffect(() => {
    const handleShowScreen = (event: ShowScreenEvent) => {
      if (event.screen === 'settings' || event.screen === 'welcome') {
        setCurrentScreen(event.screen)
      }
    }

    EventBus.instance.subscribe(ShowScreenEvent, handleShowScreen)

    return () => {
      EventBus.instance.unsubscribe(ShowScreenEvent, handleShowScreen)
    }
  }, [])

  if (isAuthenticated) {
    if (currentScreen === 'settings') {
      return <SettingsPage />
    }
    
    return (
      <WelcomeScreen
        user={user}
        onLogout={onLogout}
        onLogoutClick={onLogoutClick}
      />
    );
  }

  if (showLoginDialog) {
    return (
      <LoginDialog
        onLogin={onLogin}
        onSignUp={onSignUp}
        onFacebookLogin={onFacebookLogin}
        onGoogleLogin={onGoogleLogin}
        onGuestLogin={onGuestLogin}
        onSendPasswordReset={onSendPasswordReset}
        onTabSwitch={onTabSwitch}
      />
    );
  }

  return null;
}

