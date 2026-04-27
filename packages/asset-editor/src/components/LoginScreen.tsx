import React from 'react';
import { LoginDialog, type LoginDialogStatusMessage } from '@ocentra/core-ui/Auth/LoginDialog';
import { WindowControls } from '@/components/WindowControls';
import { useAuth } from '@/hooks/useAuth';
import { canUseDevMockAdmin, setDevAuthQueryEnabled } from '@/utils/devAuth';
import './LoginScreen.css';

export function LoginScreen() {
  const { login, loginWithGoogle, sendPasswordReset, isFirebaseConfigured } = useAuth();
  const allowDevMockAdmin = canUseDevMockAdmin();
  const statusMessage: LoginDialogStatusMessage | null = !isFirebaseConfigured
    ? {
        kind: 'info',
        text: 'Firebase not configured. Add VITE_FIREBASE_* to .env or .env.local to sign in.',
      }
    : null;

  return (
    <div className="login-screen-shell">
      <div className="login-screen-shell__window-controls">
        <WindowControls />
      </div>
      {allowDevMockAdmin ? (
        <button
          type="button"
          className="login-screen-shell__mock-button"
          onClick={() => {
            setDevAuthQueryEnabled(true);
          }}
        >
          Use mock admin
        </button>
      ) : null}
      <LoginDialog
        onLogin={login}
        onGoogleLogin={loginWithGoogle}
        onSendPasswordReset={sendPasswordReset}
        adminRequired
        adminMessage="Admin access required for Asset Editor. Sign in with an administrator account."
        brandTitle="Ocentra AI"
        appVersion={
          typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION != null
            ? String(import.meta.env.VITE_APP_VERSION)
            : '0.1.0'
        }
        statusMessage={statusMessage}
        disableCredentials={!isFirebaseConfigured}
        disableGoogleLogin={!isFirebaseConfigured}
      />
    </div>
  );
}
