import type { UserProfile } from '../../../services/firebaseService';
import LoginDialog from './LoginDialog';
import { WelcomeScreen } from '../Welcome/WelcomeScreen';

interface AuthScreenProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  showLoginDialog: boolean;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onSignUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<boolean>;
  onFacebookLogin: () => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
  onGuestLogin: () => Promise<boolean>;
  onLogout: () => void;
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
  onLogoutClick,
  onTabSwitch,
}: AuthScreenProps) {
  if (isAuthenticated) {
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
        onTabSwitch={onTabSwitch}
      />
    );
  }

  return null;
}

