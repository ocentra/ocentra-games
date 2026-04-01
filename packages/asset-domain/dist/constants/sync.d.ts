export declare const AssetSyncStatus: {
    readonly Synced: "synced";
    readonly Changed: "changed";
    readonly NotInCloud: "not_in_cloud";
    readonly Syncing: "syncing";
};
export type AssetSyncStatus = typeof AssetSyncStatus[keyof typeof AssetSyncStatus];
