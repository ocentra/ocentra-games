# Cache Integrity Policy (A5)

## Overview

When assembling chunks or reading cached model data, corruption can occur (storage failure, partial writes, etc.). This document describes the integrity and recovery workflow.

## Recovery Flow

1. **assembleChunks** reads chunks via `fetchChunkViaEvent`.
2. On any error (missing chunk, size mismatch, assembly failure):
   - Log error with modelId, fileName.
   - Call **purgeCorruptedChunkGroup(modelId, fileName, totalChunks)** to delete manifest and all chunks.
   - Rethrow so caller (e.g. fetch pipeline) refetches from source.

3. **purgeCorruptedChunkGroup** deletes:
   - `${modelId}/${fileName}:manifest`
   - `${modelId}/${fileName}_chunk_0` through `${modelId}/${fileName}_chunk_${totalChunks-1}`

## Future: Checksum Validation

- Store optional hash (e.g. SHA-256) of assembled payload in chunk manifest.
- On assembly: compute hash of concatenated chunks; if present, verify before returning.
- On mismatch: purge and refetch.

## Logging

- On corruption: `[assembleChunks] Corruption or assembly failure` with modelId, fileName.
- On purge: `[purgeCorruptedChunkGroup] Purged corrupted cache` with modelId, fileName, totalChunks.
