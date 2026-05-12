import React from 'react';
import { LoginDialog, type LoginDialogStatusMessage } from '@ocentra/core-ui/Auth/LoginDialog';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { ThreeBaseProvider } from '@ocentra/core-ui/Background/ThreeBaseContext';
import { WindowControls } from '@/components/WindowControls';
import { useAuth } from '@/hooks/useAuth';
import { canUseDevMockAdmin, setDevAuthQueryEnabled } from '@/utils/devAuth';
import './LoginScreen.css';

interface LoginScreenProps {
  contextTitle?: string;
  contextDescription?: string;
  secondaryActions?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  }>;
}

export function LoginScreen({ contextTitle, contextDescription, secondaryActions = [] }: LoginScreenProps = {}) {
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
      <div className="login-screen-shell__background" aria-hidden="true">
        <ThreeBaseProvider>
          <DynamicBackground />
        </ThreeBaseProvider>
      </div>
      <div className="login-screen-shell__window-controls">
        <WindowControls />
      </div>
      <LoginDialog
        onLogin={login}
        onGoogleLogin={loginWithGoogle}
        onSendPasswordReset={sendPasswordReset}
        secondaryActions={
          [
            ...secondaryActions,
            ...(allowDevMockAdmin
              ? [
                  {
                    label: 'Use mock admin',
                    onClick: () => {
                      setDevAuthQueryEnabled(true);
                    },
                  },
                ]
              : []),
          ]
        }
        adminRequired
        adminMessage="Admin access required for Asset Editor. Sign in with an administrator account."
        contextEyebrow="Asset Editor"
        contextTitle={contextTitle ?? 'Administrator access required'}
        contextDescription={
          contextDescription
          ?? 'The editor writes shared assets and tooling state, so it is limited to approved administrator accounts.'
        }
        brandTitle="Ocentra Editor"
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
