export declare const PlatformRuntime: {
    readonly Web: "web";
    readonly Desktop: "desktop";
    readonly Mobile: "mobile";
};
export type PlatformRuntime = (typeof PlatformRuntime)[keyof typeof PlatformRuntime];
export declare const DesktopOS: {
    readonly Mac: "mac";
    readonly Linux: "linux";
    readonly Windows: "windows";
    readonly Unknown: "unknown";
};
export type DesktopOS = (typeof DesktopOS)[keyof typeof DesktopOS];
export declare const MobileOS: {
    readonly Android: "android";
    readonly IOS: "ios";
    readonly Unknown: "unknown";
};
export type MobileOS = (typeof MobileOS)[keyof typeof MobileOS];
export declare function setPlatformRuntimeOverride(runtime: PlatformRuntime): void;
export declare function getPlatformRuntime(): PlatformRuntime;
export declare function getDesktopOS(): DesktopOS;
export declare function getMobileOS(): MobileOS;
