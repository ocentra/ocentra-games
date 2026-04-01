export const AssetSyncStatus = {
  Synced: 'synced',
  Changed: 'changed',
  NotInCloud: 'not_in_cloud',
  Syncing: 'syncing',
} as const;

export type AssetSyncStatus = typeof AssetSyncStatus[keyof typeof AssetSyncStatus];
