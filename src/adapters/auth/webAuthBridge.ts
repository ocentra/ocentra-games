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

export class WebAuthBridge implements AuthBridge {
  async getAuthToken(): Promise<string | null> {
    const authTraceEnabled = isAdminAuthTraceEnabled();
    const { auth } = await import('@/adapters/firebase/config');
    if (auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        log.logInfo(
          '[AdminAuthFlow:B1] web bridge token via firebase currentUser',
          getStackTrace(),
          { hasToken: Boolean(token) },
          authTraceEnabled
        );
        return token;
      } catch {
        log.logWarn(
          '[AdminAuthFlow:B1] web bridge firebase currentUser token fetch failed',
          getStackTrace(),
          undefined,
          authTraceEnabled
        );
      }
    } else {
      log.logWarn(
        '[AdminAuthFlow:B1] web bridge firebase currentUser unavailable',
        getStackTrace(),
        undefined,
        authTraceEnabled
      );
    }

    const hasTauriRuntime = Boolean(
      (globalThis as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }).__TAURI__ ||
      (globalThis as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
    );

    if (hasTauriRuntime) {
      try {
        const tauriCore = await import('@tauri-apps/api/core');
        const invoke = tauriCore.invoke as TauriInvoke | undefined;
        if (invoke) {
          const token = await invoke('get_auth_token');
          log.logInfo(
            '[AdminAuthFlow:B2] web bridge token via @tauri-apps/api/core fallback',
            getStackTrace(),
            { hasToken: Boolean(token) },
            authTraceEnabled
          );
          if (token) {
            return token;
          }
        }
      } catch {
        log.logWarn(
          '[AdminAuthFlow:B2] web bridge tauri core fallback unavailable',
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
            '[AdminAuthFlow:B3] web bridge token via legacy __TAURI__.invoke fallback',
            getStackTrace(),
            { hasToken: Boolean(token) },
            authTraceEnabled
          );
          return token;
        } catch {
          log.logWarn(
            '[AdminAuthFlow:B3] web bridge legacy __TAURI__.invoke fallback failed',
            getStackTrace(),
            undefined,
            authTraceEnabled
          );
        }
      }
    }

    return null;
  }
}
