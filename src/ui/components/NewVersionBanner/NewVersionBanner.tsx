import { useEffect, useState } from 'react';
import {
  startAppVersionPoll,
  APP_UPDATE_AVAILABLE_EVENT,
} from '@/lib/appVersionPoll';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import { getMobileOS, MobileOS } from '@ocentra/app-core/platform';
import './NewVersionBanner.css';

export function NewVersionBanner() {
  const { isDesktop, isMobile } = usePlatformUI();
  const [show, setShow] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isDesktop) return;
    const onUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ serverVersion: string }>;
      setServerVersion(ev.detail?.serverVersion ?? null);
      setShow(true);
    };
    window.addEventListener(APP_UPDATE_AVAILABLE_EVENT, onUpdate);
    startAppVersionPoll();
    return () => window.removeEventListener(APP_UPDATE_AVAILABLE_EVENT, onUpdate);
  }, [isDesktop]);

  if (!show) return null;

  const androidStoreUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_STORE_URL != null
      ? String(import.meta.env.VITE_ANDROID_STORE_URL)
      : '';
  const iosStoreUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_IOS_STORE_URL != null
      ? String(import.meta.env.VITE_IOS_STORE_URL)
      : '';
  const mobileOS = getMobileOS();
  const storeUrl =
    mobileOS === MobileOS.Android ? androidStoreUrl : mobileOS === MobileOS.IOS ? iosStoreUrl : '';

  const openStore = async (): Promise<void> => {
    if (!storeUrl) return;
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: storeUrl });
    } catch {
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="new-version-banner" role="status">
      <span className="new-version-banner__text">
        New version available{serverVersion ? ` (${serverVersion})` : ''}{isMobile ? ' – update to continue.' : ' – refresh to update.'}
      </span>
      <div className="new-version-banner__actions">
        {isMobile ? (
          <button
            type="button"
            className="new-version-banner__btn new-version-banner__btn--primary"
            onClick={() => void openStore()}
            disabled={!storeUrl}
          >
            Open store
          </button>
        ) : (
          <button
            type="button"
            className="new-version-banner__btn new-version-banner__btn--primary"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        )}
        <button
          type="button"
          className="new-version-banner__btn new-version-banner__btn--secondary"
          onClick={() => setShow(false)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
