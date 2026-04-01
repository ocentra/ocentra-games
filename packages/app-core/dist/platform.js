export const PlatformRuntime = {
    Web: 'web',
    Desktop: 'desktop',
    Mobile: 'mobile',
};
export const DesktopOS = {
    Mac: 'mac',
    Linux: 'linux',
    Windows: 'windows',
    Unknown: 'unknown',
};
export const MobileOS = {
    Android: 'android',
    IOS: 'ios',
    Unknown: 'unknown',
};
let platformRuntimeOverride = null;
export function setPlatformRuntimeOverride(runtime) {
    platformRuntimeOverride = runtime;
}
export function getPlatformRuntime() {
    if (platformRuntimeOverride)
        return platformRuntimeOverride;
    if (typeof globalThis !== 'undefined' && globalThis.Capacitor) {
        return PlatformRuntime.Mobile;
    }
    if (typeof globalThis !== 'undefined' &&
        globalThis.__TAURI__) {
        return PlatformRuntime.Desktop;
    }
    if (typeof navigator !== 'undefined' &&
        navigator.userAgent?.toLowerCase().includes('electron')) {
        return PlatformRuntime.Desktop;
    }
    if (typeof navigator !== 'undefined' &&
        navigator.userAgent?.toLowerCase().includes('tauri')) {
        return PlatformRuntime.Desktop;
    }
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        return PlatformRuntime.Mobile;
    }
    return PlatformRuntime.Web;
}
export function getDesktopOS() {
    if (getPlatformRuntime() !== PlatformRuntime.Desktop)
        return DesktopOS.Unknown;
    if (typeof navigator === 'undefined')
        return DesktopOS.Unknown;
    const ua = navigator.userAgent?.toLowerCase() ?? '';
    if (ua.includes('mac'))
        return DesktopOS.Mac;
    if (ua.includes('win'))
        return DesktopOS.Windows;
    if (ua.includes('linux'))
        return DesktopOS.Linux;
    return DesktopOS.Unknown;
}
export function getMobileOS() {
    if (getPlatformRuntime() !== PlatformRuntime.Mobile)
        return MobileOS.Unknown;
    if (typeof navigator === 'undefined')
        return MobileOS.Unknown;
    const ua = navigator.userAgent?.toLowerCase() ?? '';
    if (ua.includes('android'))
        return MobileOS.Android;
    if (ua.includes('iphone') || ua.includes('ipad'))
        return MobileOS.IOS;
    return MobileOS.Unknown;
}
