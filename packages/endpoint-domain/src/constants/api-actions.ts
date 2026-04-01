export const ApiAction = {
  Scan: 'scan',
  SyncToR2: 'sync-to-r2',
  SyncFromR2: 'sync-from-r2',
  ScanR2Status: 'scan-r2-status',
  SyncStatus: 'sync-status',
  SyncAsset: 'sync-asset',
  UploadFiles: 'upload-files',
  GamesListByCategory: 'games-list-by-category',
  GamesGetTemplate: 'games-get-template',
  ResolveBatch: 'resolve-batch',
  HydrateKV: 'hydrate-kv',
  GetUploadUrl: 'get-upload-url',
} as const;

export type ApiAction = typeof ApiAction[keyof typeof ApiAction];
