# Parallel Processing Patterns - Codebase Analysis

## Overview

This document analyzes the patterns used in the codebase for handling:
1. **Server-side parallel processing with debouncing** (manifestUpdater.ts)
2. **React strict mode double-render protection** (DeckInspector.tsx)
3. **Parallel batch processing** (Deck.ts card creation)

---

## Pattern 1: Server-Side Debounced Batch Updates

### Location: `vite/middleware/manifestUpdater.ts`

### Problem
- Multiple assets saved simultaneously (e.g., 52 cards)
- Each save triggers Manifest update
- Need to batch updates to avoid file system contention

### Solution: Accumulation + Debouncing + Write Lock

**Key Components:**
1. **Module-level state** (shared across calls):
   - `accumulatedRecords: Map` - accumulates records
   - `debounceTimer: Timeout` - debounce timer
   - `manifestWriteLock: Promise` - write lock

2. **Accumulation Pattern:**
   ```typescript
   for (const record of assetRecords) {
     const existing = accumulatedRecords.get(record.guid)
     if (!existing || content) {
       accumulatedRecords.set(record.guid, { record, content })
     }
   }
   ```

3. **Debouncing Pattern:**
   ```typescript
   if (debounceTimer) clearTimeout(debounceTimer)
   debounceTimer = setTimeout(async () => {
     // Process accumulated records
   }, 200)
   ```

4. **Write Lock Pattern:**
   ```typescript
   if (manifestWriteLock) {
     await manifestWriteLock  // Wait for in-progress write
   }
   manifestWriteLock = executeUpdate()
   await manifestWriteLock
   manifestWriteLock = null
   ```

5. **Parallel Processing:**
   ```typescript
   const entries = await Promise.all(
     recordsToProcess.map(({ record, content }) => buildManifestEntry(record, content))
   )
   ```

**Result:** 52 cards saved → 1 Manifest update (batched, debounced, locked)

---

## Pattern 2: React Strict Mode Double-Render Protection

### Location: `src/lib/assets/card/deck/DeckInspector.tsx`

### Problem
- React Strict Mode runs effects twice in development
- Causes duplicate API calls, duplicate validations

### Solution: useRef Guard + Early Return

**Key Components:**
1. **useRef for execution state:**
   ```typescript
   const hasAutoEnsuredRef = useRef<boolean>(false)
   ```

2. **Early return guard:**
   ```typescript
   if (!assetGuid || hasAutoEnsuredRef.current) return
   ```

3. **Set flag early (before async):**
   ```typescript
   hasAutoEnsuredRef.current = true  // Set BEFORE async work
   const deckInstance = await ScriptableObject.loadByGuid(...)
   ```

4. **Reset on dependency change:**
   ```typescript
   useEffect(() => {
     hasAutoEnsuredRef.current = false
   }, [assetGuid])
   ```

5. **Reset on error:**
   ```typescript
   catch (error) {
     hasAutoEnsuredRef.current = false  // Allow retry
   }
   ```

**Additional Pattern: Stable Reference Check**
```typescript
const lastGuidsRef = useRef<string>('')
const currentGuids = cardTemplates.map(t => t.guid).join(',')
if (currentGuids === lastGuidsRef.current) return  // Skip if unchanged
lastGuidsRef.current = currentGuids
```

**Result:** Prevents duplicate execution even with React Strict Mode

---

## Pattern 3: Sequential vs Parallel Processing

### Current: Sequential Batches

**Location:** `Deck.ts` - `buildSmartHashMap()`, `mapImagesToCards()`

```typescript
// Sequential batches
for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
  const batch = files.slice(batchStart, batchStart + BATCH_SIZE)
  await Promise.all(batch.map(async (file) => {
    // Process file
  }))
  // Waits for batch before next batch
}
```

**Issues:**
- Batch 1 → wait → Batch 2 → wait → Batch 3
- 52 files ÷ 10 per batch = 6 sequential batches
- Slower overall completion

### Potential: Fully Parallel

```typescript
// Fully parallel
await Promise.all(files.map(async (file) => {
  // Process all files simultaneously
}))
```

**Benefits:**
- All files processed at once
- Faster completion
- Server-side batching handles Manifest updates

---

## Summary: Applying Patterns to Image Assignment

### For Image Uploads

1. **Use accumulation + debouncing** (like manifestUpdater)
   - Accumulate image records in Map
   - 200ms debounce for Manifest updates
   - Single read/write cycle

2. **Process images in parallel** (not sequential batches)
   - All images simultaneously
   - Server handles batching automatically
   - Faster completion

3. **Use write lock** for Manifest updates
   - Prevent concurrent writes
   - Ensure sequential file operations

### For Card Updates

1. **Process cards in parallel** (not sequential)
   - All cards update simultaneously
   - Server batches Manifest updates
   - Faster overall

2. **Use useRef guards** in React components
   - Prevent double-execution
   - Track processing state
   - Reset on errors

3. **Progress callbacks** still work with parallel
   - Update UI as each completes
   - Faster overall progress

### Key Takeaways

1. **Debouncing is critical** for batching rapid updates
2. **Write locks prevent** file system race conditions
3. **useRef guards prevent** React strict mode double-execution
4. **Parallel processing** can be applied where operations are independent
5. **Server-side batching** handles client-side parallel requests efficiently

