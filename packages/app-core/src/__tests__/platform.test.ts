import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTauri } from '@tauri-apps/api/core';
import { getPlatformRuntime, PlatformRuntime } from '../platform';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(),
}));

const mockedIsTauri = vi.mocked(isTauri);

function stubNavigator(options: { userAgent: string; webdriver?: boolean; product?: string }): void {
  vi.stubGlobal(
    'navigator',
    {
      userAgent: options.userAgent,
      webdriver: options.webdriver ?? false,
      product: options.product ?? 'Gecko',
    } as Navigator,
  );
}

describe('getPlatformRuntime', () => {
  beforeEach(() => {
    mockedIsTauri.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockedIsTauri.mockReset();
  });

  it('treats webdriver browser automation as web even when tauri signals are present', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      webdriver: true,
    });
    mockedIsTauri.mockReturnValue(true);

    expect(getPlatformRuntime()).toBe(PlatformRuntime.Web);
  });

  it('detects genuine tauri runtime as desktop', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      webdriver: false,
    });
    mockedIsTauri.mockReturnValue(true);

    expect(getPlatformRuntime()).toBe(PlatformRuntime.Desktop);
  });

  it('treats electron browser automation contexts as web', () => {
    stubNavigator({
      userAgent: 'Mozilla/5.0 Electron/30.0.0',
      webdriver: false,
    });

    expect(getPlatformRuntime()).toBe(PlatformRuntime.Web);
  });
});
