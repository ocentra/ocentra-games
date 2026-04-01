import { useState } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';

export function DesktopCheckForUpdates() {
  const { isDesktop } = usePlatformUI();
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'none' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; body?: string } | null>(null);

  if (!isDesktop) return null;

  const handleCheck = async () => {
    setStatus('checking');
    setMessage(null);
    setUpdateInfo(null);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setUpdateInfo({ version: update.version, body: update.body ?? undefined });
        setStatus('available');
      } else {
        setStatus('none');
        setMessage('You\'re up to date.');
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Check failed.');
    }
  };

  const handleInstall = async () => {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        setMessage('Update installed. Restart the app to complete.');
        setStatus('none');
        setUpdateInfo(null);
      }
    } catch {
      setStatus('error');
      setMessage('Install failed.');
    }
  };

  return (
    <div className="desktop-check-updates">
      <button
        type="button"
        className="desktop-check-updates__btn"
        onClick={handleCheck}
        disabled={status === 'checking'}
      >
        {status === 'checking' ? 'Checking…' : 'Check for updates'}
      </button>
      {status === 'none' && message && (
        <span className="desktop-check-updates__msg">{message}</span>
      )}
      {status === 'available' && updateInfo && (
        <div className="desktop-check-updates__available">
          <span className="desktop-check-updates__version">
            Version {updateInfo.version} available.
          </span>
          {updateInfo.body && (
            <p className="desktop-check-updates__notes">{updateInfo.body}</p>
          )}
          <button
            type="button"
            className="desktop-check-updates__install-btn"
            onClick={handleInstall}
          >
            Download & install
          </button>
        </div>
      )}
      {status === 'error' && message && (
        <span className="desktop-check-updates__error">{message}</span>
      )}
    </div>
  );
}
