import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginScreen } from '@/components/LoginScreen';
import { AssetEditorPage } from '@/pages/MainPage/AssetEditorPage';
import { StandalonePanelPage } from '@/pages/StandalonePanelPage';
import { WindowControls } from '@/components/WindowControls';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isE2EBypassAuthEnabled } from '@/utils/e2eAuth';
import '@ocentra/core-ui/tokens.css';
import './styles/editor.css';

const appLog = AssetEditorLogger.instance;
appLog.register(import.meta.url);
export const LOG_APP_RENDER = true;
const appLogInfo = (message: string, data?: unknown, enabled: boolean = true) => {
  try {
    appLog.logInfo(message, getStackTrace(), data, enabled);
  } catch {
    // never break render
  }
};

function AdminRequired() {
  const { user, logout } = useAuth();
  return (
    <div className="editor-access-denied-wrap" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f1117' }}>
      <div className="editor-access-denied__header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0 0' }}>
        <WindowControls />
      </div>
      <div className="editor-access-denied" style={{ flex: 1 }}>
        <p>Signed in as <strong>{user?.email}</strong> but this account does not have admin access.</p>
        <button type="button" onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}

export function App() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const e2eBypassAuth = isE2EBypassAuthEnabled();
  const isStandalone = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.has('standalone') && p.has('assetPath');
  }, []);

  if (isStandalone) {
    return <StandalonePanelPage />;
  }

  if (e2eBypassAuth) {
    return (
      <div data-testid="editor-e2e-ready">
        <AssetEditorPage />
      </div>
    );
  }

  const branch = isLoading ? 'loading' : !isAuthenticated ? 'login' : !isAdmin ? 'admin-required' : 'editor';
  appLogInfo('[App] render', { isLoading, isAuthenticated, isAdmin, branch }, LOG_APP_RENDER);

  if (isLoading) {
    return (
      <div className="editor-loading-wrap" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f1117' }}>
        <div className="editor-loading__header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0 0' }}>
          <WindowControls />
        </div>
        <div
          className="editor-loading"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!isAdmin) {
    return <AdminRequired />;
  }

  return <AssetEditorPage />;
}
