import type { EditorUser } from '@/types/auth';

const DEV_AUTH_MODE = import.meta.env.VITE_EDITOR_DEV_AUTH;
const DEV_AUTH_QUERY_KEY = 'mock';

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function canUseBrowserDevMockAdmin(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    isLocalhostHost(window.location.hostname) &&
    !isTauriRuntime() &&
    DEV_AUTH_MODE !== 'off'
  );
}

export function canUseDevMockAdmin(): boolean {
  return canUseBrowserDevMockAdmin();
}

export function isDevMockAdminEnabled(): boolean {
  if (!canUseBrowserDevMockAdmin()) {
    return false;
  }

  if (DEV_AUTH_MODE === 'mock-admin') {
    return true;
  }

  return getDevAuthQueryEnabled();
}

export function getDevAuthQueryEnabled(): boolean {
  if (!canUseBrowserDevMockAdmin()) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const value = params.get(DEV_AUTH_QUERY_KEY)?.toLowerCase();
  return value === 'true' || value === '1' || value === 'admin';
}

export function setDevAuthQueryEnabled(enabled: boolean): void {
  if (!canUseBrowserDevMockAdmin()) {
    return;
  }

  const url = new URL(window.location.href);
  if (enabled) {
    url.searchParams.set(DEV_AUTH_QUERY_KEY, 'true');
  } else {
    url.searchParams.delete(DEV_AUTH_QUERY_KEY);
  }
  window.location.assign(url.toString());
}

export function applyDevAuthQueryToUrl(url: string): string {
  if (!canUseBrowserDevMockAdmin() || !getDevAuthQueryEnabled()) {
    return url;
  }

  const nextUrl = new URL(url, window.location.origin);
  nextUrl.searchParams.set(DEV_AUTH_QUERY_KEY, 'true');
  return nextUrl.toString();
}

export const DEV_MOCK_ADMIN_USER: EditorUser = {
  uid: 'asset-editor-dev-admin',
  email: 'asset-editor-dev-admin@ocentra.local',
  displayName: 'Mock Admin',
  photoURL: null,
  isAdmin: true,
};
