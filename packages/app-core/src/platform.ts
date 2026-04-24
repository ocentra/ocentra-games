import { isTauri } from '@tauri-apps/api/core';

export const PlatformRuntime = {
  Web: 'web',
  Desktop: 'desktop',
  Mobile: 'mobile',
} as const;

export type PlatformRuntime = (typeof PlatformRuntime)[keyof typeof PlatformRuntime];

export const DesktopOS = {
  Mac: 'mac',
  Linux: 'linux',
  Windows: 'windows',
  Unknown: 'unknown',
} as const;

export type DesktopOS = (typeof DesktopOS)[keyof typeof DesktopOS];

export const MobileOS = {
  Android: 'android',
  IOS: 'ios',
  Unknown: 'unknown',
} as const;

export type MobileOS = (typeof MobileOS)[keyof typeof MobileOS];

let platformRuntimeOverride: PlatformRuntime | null = null;

export function setPlatformRuntimeOverride(runtime: PlatformRuntime): void {
  platformRuntimeOverride = runtime;
}

export function getPlatformRuntime(): PlatformRuntime {
  if (platformRuntimeOverride) return platformRuntimeOverride;
  if (typeof globalThis !== 'undefined' && (globalThis as { Capacitor?: unknown }).Capacitor) {
    return PlatformRuntime.Mobile;
  }
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return PlatformRuntime.Web;
  }
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent?.toLowerCase().includes('tauri')
  ) {
    return PlatformRuntime.Desktop;
  }
  if (isTauri()) {
    return PlatformRuntime.Desktop;
  }
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return PlatformRuntime.Mobile;
  }
  return PlatformRuntime.Web;
}

export function getDesktopOS(): DesktopOS {
  if (getPlatformRuntime() !== PlatformRuntime.Desktop) return DesktopOS.Unknown;
  if (typeof navigator === 'undefined') return DesktopOS.Unknown;
  const ua = navigator.userAgent?.toLowerCase() ?? '';
  if (ua.includes('mac')) return DesktopOS.Mac;
  if (ua.includes('win')) return DesktopOS.Windows;
  if (ua.includes('linux')) return DesktopOS.Linux;
  return DesktopOS.Unknown;
}

export function getMobileOS(): MobileOS {
  if (getPlatformRuntime() !== PlatformRuntime.Mobile) return MobileOS.Unknown;
  if (typeof navigator === 'undefined') return MobileOS.Unknown;
  const ua = navigator.userAgent?.toLowerCase() ?? '';
  if (ua.includes('android')) return MobileOS.Android;
  if (ua.includes('iphone') || ua.includes('ipad')) return MobileOS.IOS;
  return MobileOS.Unknown;
}
