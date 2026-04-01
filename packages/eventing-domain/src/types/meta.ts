export interface MetaData {
  guid: string
  assetType?: string
  mimeType: string
  createdAt: string
  modifiedAt: string
  fileSize: number
  checksum: string
  imageHash?: string
  imageETag?: string
  imageCachedAt?: string
  imageCacheKey?: string
  cloudLastModified?: string
  gameId?: string | null
  lastSyncFromCloud?: string | null
  lastSyncToCloud?: string | null
}


export interface GuidValidationResult {
  isValid: boolean
  errors: string[]
  duplicates?: Map<string, string[]>
  orphans?: string[]
}

