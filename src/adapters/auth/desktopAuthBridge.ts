import type { AuthBridge } from '@ocentra/auth-domain/AuthBridge';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

type TauriInvoke = (cmd: string) => Promise<string | null>;
const ADMIN_AUTH_TRACE_STORAGE_KEY = 'ocentra:debug:admin-auth';
const log = MainAppLogger.instance;
log.register(import.meta.url);

function isAdminAuthTraceEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(ADMIN_AUTH_TRACE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export class DesktopAuthBridge implements AuthBridge {
  async getAuthToken(): Promise<string | null> {
    const authTraceEnabled = isAdminAuthTraceEnabled();
    const { auth } = await import('@/adapters/firebase/config');
    if (auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        log.logInfo(
          '[AdminAuthFlow:B1] desktop bridge token via firebase currentUser',
          getStackTrace(),
          { hasToken: Boolean(token) },
          authTraceEnabled
        );
        return token;
      } catch {
        log.logWarn(
          '[AdminAuthFlow:B1] desktop bridge firebase currentUser token fetch failed',
          getStackTrace(),
          undefined,
          authTraceEnabled
        );
      }
    } else {
      log.logWarn(
        '[AdminAuthFlow:B1] desktop bridge firebase currentUser unavailable',
        getStackTrace(),
        undefined,
        authTraceEnabled
      );
    }

    try {
      const tauriCore = await import('@tauri-apps/api/core');
      const invoke = tauriCore.invoke as TauriInvoke | undefined;
      if (invoke) {
        const token = await invoke('get_auth_token');
        log.logInfo(
          '[AdminAuthFlow:B2] desktop bridge token via @tauri-apps/api/core invoke',
          getStackTrace(),
          { hasToken: Boolean(token) },
          authTraceEnabled
        );
        return token;
      }
    } catch {
      log.logWarn(
        '[AdminAuthFlow:B2] desktop bridge @tauri-apps/api/core invoke unavailable',
        getStackTrace(),
        undefined,
        authTraceEnabled
      );
    }

    const tauri = (globalThis as { __TAURI__?: { invoke?: TauriInvoke } }).__TAURI__;
    if (tauri?.invoke) {
      try {
        const token = await tauri.invoke('get_auth_token');
        log.logInfo(
          '[AdminAuthFlow:B3] desktop bridge token via legacy __TAURI__.invoke',
          getStackTrace(),
          { hasToken: Boolean(token) },
          authTraceEnabled
        );
        return token;
      } catch {
        log.logWarn(
          '[AdminAuthFlow:B3] desktop bridge legacy __TAURI__.invoke failed',
          getStackTrace(),
          undefined,
          authTraceEnabled
        );
        return null;
      }
    }

    const electronAPI = (globalThis as { electronAPI?: { getAuthToken?: () => Promise<string | null> } }).electronAPI;
    if (electronAPI?.getAuthToken) {
      log.logInfo(
        '[AdminAuthFlow:B4] desktop bridge token via electron bridge',
        getStackTrace(),
        undefined,
        authTraceEnabled
      );
      return electronAPI.getAuthToken();
    }

    log.logWarn(
      '[AdminAuthFlow:B5] desktop bridge no auth provider available',
      getStackTrace(),
      undefined,
      authTraceEnabled
    );
    return null;
  }
}
