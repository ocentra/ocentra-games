import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('DesktopAuthBridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unmock('@/adapters/firebase/config');
    vi.unmock('@tauri-apps/api/core');
  });

  it('prefers the live Firebase user token in desktop runtime', async () => {
    const getIdToken = vi.fn().mockResolvedValue('firebase-token');
    const invoke = vi.fn().mockResolvedValue('tauri-token');

    vi.doMock('@/adapters/firebase/config', () => ({
      auth: {
        currentUser: {
          getIdToken,
        },
      },
    }));
    vi.doMock('@tauri-apps/api/core', () => ({
      invoke,
    }));

    const { DesktopAuthBridge } = await import('@/adapters/auth/desktopAuthBridge');
    const bridge = new DesktopAuthBridge();

    await expect(bridge.getAuthToken()).resolves.toBe('firebase-token');
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls back to the Tauri command when no Firebase user is available', async () => {
    const invoke = vi.fn().mockResolvedValue('tauri-token');

    vi.doMock('@/adapters/firebase/config', () => ({
      auth: {
        currentUser: null,
      },
    }));
    vi.doMock('@tauri-apps/api/core', () => ({
      invoke,
    }));

    const { DesktopAuthBridge } = await import('@/adapters/auth/desktopAuthBridge');
    const bridge = new DesktopAuthBridge();

    await expect(bridge.getAuthToken()).resolves.toBe('tauri-token');
    expect(invoke).toHaveBeenCalledWith('get_auth_token');
  });
});
