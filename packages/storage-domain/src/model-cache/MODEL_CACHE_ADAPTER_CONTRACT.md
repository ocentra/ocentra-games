# ModelCacheAdapter Contract

## Required vs Optional Methods

### Required (all platforms)

- `getManifestEntry(repo)` - Get manifest for a model repo
- `addManifestEntry(repo, entry)` - Add manifest entry
- `addQuantToManifest(repo, quantPath, status, files?)` - Add quant to manifest
- `getChunkInfo(repo, path)` - Get chunk metadata
- `saveChunkedFileSafe(repo, path, blob, onUpdate?)` - Save chunked file
- `getFromIndexedDB(repo, path)` - Get raw bytes from store
- `extractDtypeFromPath(filePath)` - Extract dtype from path

### Optional (per-platform)

- `getAllManifestEntries()` - Returns `[]` when not implemented
- `deleteManifestEntry(repo)` - No-op when not implemented
- `getByKey(key)` - Returns `null` when not implemented
- `getBlobByKey(key)` - Returns `null` when not implemented
- `saveBlobByKey(key, blob)` - No-op when not implemented
- `deleteBlobByKey(key)` - No-op when not implemented
- `getAllFileEntries()` - Returns `[]` when not implemented
- `getInferenceSettings(id)` - Returns `null` when not implemented
- `saveInferenceSettings(id, settings)` - No-op when not implemented
- `tryServeFromCache(url, modelId)` - Handler not registered when not implemented

## Platform Notes

- **IDBModelCacheAdapter**: Implements all methods
- **FileSystemModelCacheAdapter**: May omit blob/KV methods
- **NativeModelCacheAdapter** (in-memory/AsyncStorage): Implements core; optional methods may be no-op

## Cache Integrity (A5)

- Chunk read/assembly should verify payload integrity where feasible
- On mismatch: purge corrupted cache entries and refetch
- Emit actionable logs/events for corruption and recovery
- Future: add checksum/hash validation for chunk groups; adapter may expose optional `verifyChunkIntegrity(repo, path, blob, expectedSize?)`
