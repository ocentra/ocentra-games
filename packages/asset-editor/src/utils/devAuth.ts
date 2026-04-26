import type { EditorUser } from '@/types/auth';

const DEV_AUTH_MODE = import.meta.env.VITE_EDITOR_DEV_AUTH;

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isDevMockAdminEnabled(): boolean {
  if (!import.meta.env.DEV || DEV_AUTH_MODE !== 'mock-admin') {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return isLocalhostHost(window.location.hostname);
}

export const DEV_MOCK_ADMIN_USER: EditorUser = {
  uid: 'asset-editor-dev-admin',
  email: 'asset-editor-dev-admin@ocentra.local',
  displayName: 'Asset Editor Dev Admin',
  photoURL: null,
  isAdmin: true,
};
