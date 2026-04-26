import type { EditorUser } from '@/types/auth';

const DEV_AUTH_MODE = import.meta.env.VITE_EDITOR_DEV_AUTH;
const DEV_AUTH_SESSION_KEY = 'asset-editor-dev-auth-mode';

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isDevMockAdminEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  if (!isLocalhostHost(window.location.hostname)) {
    return false;
  }

  const sessionOverride = getDevAuthSessionOverride();
  if (sessionOverride === 'off' || DEV_AUTH_MODE === 'off') {
    return false;
  }

  if (sessionOverride === 'mock-admin') {
    return true;
  }

  return DEV_AUTH_MODE === 'mock-admin' || DEV_AUTH_MODE === undefined;
}

export function canUseDevMockAdmin(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    isLocalhostHost(window.location.hostname) &&
    DEV_AUTH_MODE !== 'off'
  );
}

export function getDevAuthSessionOverride(): 'mock-admin' | 'off' | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.sessionStorage.getItem(DEV_AUTH_SESSION_KEY);
    return value === 'mock-admin' || value === 'off' ? value : null;
  } catch {
    return null;
  }
}

export function setDevAuthSessionOverride(value: 'mock-admin' | 'off' | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.sessionStorage.removeItem(DEV_AUTH_SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(DEV_AUTH_SESSION_KEY, value);
  } catch {
    return;
  }
}

export const DEV_MOCK_ADMIN_USER: EditorUser = {
  uid: 'asset-editor-dev-admin',
  email: 'asset-editor-dev-admin@ocentra.local',
  displayName: 'Asset Editor Dev Admin',
  photoURL: null,
  isAdmin: true,
};
