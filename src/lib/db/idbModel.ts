import { INFERENCE_SETTINGS_SINGLETON_ID, type InferenceSettings } from './InferenceSettings';
import { DBNames } from './idbSchema';

// --- Types ---
// Per erasableSyntaxOnly: Use const object instead of enum
export const QuantStatus = {
  Available: 'available',
  Downloaded: 'downloaded',
  Failed: 'failed',
  NotFound: 'not_found',
  Unavailable: 'unavailable',
  Unsupported: 'unsupported',
  ServerOnly: 'server_only',
} as const;

export type QuantStatus = typeof QuantStatus[keyof typeof QuantStatus];

export type QuantInfo = {
  files: string[]; // Full paths (rfilename) to all required files for this quant
  status: QuantStatus;
  dtype: string; // Clean quantization type: "q4f16", "fp16", "fp32", etc.
  hasExternalData: boolean; // Whether this quant uses external data format (split files)
  inferenceSettings?: InferenceSettings; // Per-model+quant settings (optional, falls back to defaults)
};

export const CURRENT_MANIFEST_VERSION = 1;
// Default size limit - will be overridden by settings
export const DEFAULT_SERVER_ONLY_SIZE = 2.1 * 1024 * 1024 * 1024; // 2.1GB

// Chunked download constants
export const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
export const PAUSE_BYTES_THRESHOLD = 100 * 1024 * 1024; // 100MB pause threshold

/**
 * Check if a file should be chunked based on size
 */
export function shouldChunkFile(fileSize: number): boolean {
  return fileSize > CHUNK_SIZE;
}

/**
 * Extract clean quantization type from file path
 * @param filePath - File path like "onnx/model_q4f16.onnx" or "onnx/model.onnx"
 * @returns Clean dtype like "q4f16", "fp16", "fp32", etc.
 */
export function extractCleanDtype(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    console.log('[extractCleanDtype] Invalid filePath:', filePath);
    return 'fp32';
  }

  // Extract filename from path
  const filename = filePath.split('/').pop() || filePath;

  // Remove .onnx extension
  const nameWithoutExt = filename.replace(/\.onnx$/, '');

  if (LOG_DEBUG)
    console.log(
      '[extractCleanDtype] Processing:',
      filePath,
      '-> filename:',
      filename,
      '-> nameWithoutExt:',
      nameWithoutExt
    );

  // Extract quantization type from filename (check longer patterns first)
  if (nameWithoutExt.includes('q4f16')) return 'q4f16';
  if (nameWithoutExt.includes('uint8')) return 'uint8'; // Check uint8 before int8
  if (nameWithoutExt.includes('int8')) return 'int8';
  if (nameWithoutExt.includes('bnb4')) return 'bnb4';
  if (nameWithoutExt.includes('q4')) return 'q4';
  if (nameWithoutExt.includes('q8')) return 'q8';
  if (nameWithoutExt.includes('fp16')) return 'fp16';
  if (nameWithoutExt.includes('fp32')) return 'fp32';
  if (nameWithoutExt.includes('quantized')) return 'quantized';

  // Default to fp32 if no match (for "model.onnx" files)
  console.log('[extractCleanDtype] No match found, defaulting to fp32 for:', filePath);
  return 'fp32';
}

// Function to get the current server-only size limit from settings
export function getServerOnlySizeLimit(): number {
  try {
    const stored = localStorage.getItem('claimModelLoadingSettings');
    if (LOG_DEBUG) console.log(`${prefix} getServerOnlySizeLimit - stored settings:`, stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (LOG_DEBUG) console.log(`${prefix} getServerOnlySizeLimit - parsed settings:`, parsed);
      const limit = (parsed.maxModelSize || 2.1) * 1024 * 1024 * 1024;
      if (LOG_DEBUG) console.log(`${prefix} getServerOnlySizeLimit - calculated limit:`, limit / (1024*1024*1024), 'GB');
      return limit;
    }
  } catch (e) {
    if (LOG_ERROR) console.error(`${prefix} Error parsing model loading settings:`, e);
  }
  if (LOG_DEBUG) console.log(`${prefix} getServerOnlySizeLimit - using default:`, DEFAULT_SERVER_ONLY_SIZE / (1024*1024*1024), 'GB');
  return DEFAULT_SERVER_ONLY_SIZE;
}

// Function to get the current bypass models from settings
export function getBypassSizeLimitModels(): Set<string> {
  try {
    const stored = localStorage.getItem('claimModelLoadingSettings');
    if (LOG_DEBUG) console.log(`${prefix} getBypassSizeLimitModels - stored settings:`, stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (LOG_DEBUG) console.log(`${prefix} getBypassSizeLimitModels - parsed settings:`, parsed);
      const bypassSet = new Set<string>(parsed.bypassModels || []);
      if (LOG_DEBUG) console.log(`${prefix} getBypassSizeLimitModels - bypass models:`, Array.from(bypassSet));
      return bypassSet;
    }
  } catch (e) {
    if (LOG_ERROR) console.error(`${prefix} Error parsing model loading settings:`, e);
  }
  
  // Default bypass models (MediaPipe models that need to bypass size limits)
  const defaultBypassModels = new Set<string>([
    'google/gemma-3n-E4B-it-litert-lm'
  ]);
  
  if (LOG_DEBUG) console.log(`${prefix} getBypassSizeLimitModels - using default bypass models:`, Array.from(defaultBypassModels));
  return defaultBypassModels;
}

export type ManifestEntry = {
  repo: string; // e.g., "microsoft/Phi-3-mini-4k-instruct-onnx"
  quants: Record<string, QuantInfo>; // Key is the full rfilename of the .onnx file
  task?: string; // e.g., "text-generation"
  manifestVersion: number; // Version of the manifest structure itself
};

const prefix = '[ClaimIDBModel]';
const LOG_GENERAL = false;  // General operational logs
const LOG_DEBUG = false;   // Detailed debugging logs (can be noisy)
const LOG_ERROR = true;    // Error logs (always enabled)
const LOG_WARN = false;    // DISABLED - Focus on backgroundModelManager only
const LOG_INFERENCE_SETTINGS = true; // Inference settings specific logs - ENABLED to debug cutoff values
const LOG_OPEN_DB = false; // Database open/close logs
const LOG_MANIFEST = false; // Manifest operation logs
const LOG_CHUNKS = false;  // Chunking operation logs
const LOG_CACHE = false;   // Cache hit/miss logs

// Throttling for high-frequency operations
let cacheLogCount = 0;
let manifestLogCount = 0;
const LOG_THROTTLE_INTERVAL = 20; // Log every 20 operations

type IndexedDBFileEntry = {
  url: string;
  data?: Blob | Uint8Array | { size?: number } | null;
  blob?: Blob | null;
  size?: number;
  [key: string]: unknown;
};

type HuggingFaceSibling = {
  rfilename: string;
  size?: number;
  skip?: boolean;
  [key: string]: unknown;
};

type HuggingFaceModelMetadata = {
  siblings?: HuggingFaceSibling[];
  pipeline_tag?: string;
  [key: string]: unknown;
};

type HuggingFaceTreeFile = {
  path?: string;
  [key: string]: unknown;
};

interface NeededFileEntry {
  id: string;
  type: 'manifest';
  chunkGroupId: string;
  fileName: string;
  folder: string;
  fileType?: string;
  size: number;
  totalChunks: number;
  chunkSizeUsed: number;
  status: string;
  addedAt: number;
}

function extractEntrySize(entry: IndexedDBFileEntry): number {
  if (typeof entry.size === 'number') {
    return entry.size;
  }

  const data = entry.data;
  if (data && typeof (data as { size?: number }).size === 'number') {
    return (data as { size: number }).size;
  }

  if (data instanceof Blob) {
    return data.size;
  }

  if (data instanceof Uint8Array) {
    return data.length;
  }

  if (entry.blob instanceof Blob) {
    return entry.blob.size;
  }

  return 0;
}

export const modelCacheSchema = {
    [DBNames.DB_MODELS]: {
      version: CURRENT_MANIFEST_VERSION, 
      stores: {
        files: {
          keyPath: 'url',
          indexes: []
        },
        manifest: {
          keyPath: 'repo',
          indexes: []
        },
        inferenceSettings: {
          keyPath: 'id',
          indexes: []
        }
      }
    }
  };

// Helper function to get HuggingFace token from IndexedDB
export async function getHuggingFaceToken(): Promise<string | null> {
    try {
        const tokenBlob = await getFromIndexedDB('huggingface_token');
        return tokenBlob ? await tokenBlob.text() : null;
    } catch (error) {
        if (LOG_WARN) console.warn(prefix, '[getHuggingFaceToken] Failed to get token:', error);
        return null;
    }
}

// Helper function to create authenticated fetch headers
export async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
    const token = await getHuggingFaceToken();
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };
    
    if (token && token.startsWith('hf_')) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Model management functions for UI
export interface CachedModelInfo {
  modelId: string;
  modelPath: string;
  totalSize: number;
  numChunks: number;
  chunkSize: number;
  downloadDate: string;
  cacheKey: string;
  metadataKey: string;
  chunkKeys: string[];
}

export async function getAllCachedModels(): Promise<CachedModelInfo[]> {
  const models: CachedModelInfo[] = [];
  
  try {
    if (LOG_DEBUG) console.log(prefix, '[getAllCachedModels] Starting to retrieve cached models...');
    
    // Get all keys from IndexedDB
    const db = await openModelCacheDB();
    const transaction = db.transaction(['files'], 'readonly');
    const store = transaction.objectStore('files');
    const request = store.getAll();
    
    const allData = await new Promise<IndexedDBFileEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Found ${allData.length} total entries in IndexedDB`);
    
    // Group by model ID and collect chunks
    const modelGroups = new Map<string, { chunks: string[], totalSize: number, chunkSizes: number[] }>();
    
    for (const item of allData) {
      const key = item.url;
      
      if (LOG_DEBUG && key.includes('chunk')) {
        console.log(prefix, `[getAllCachedModels] Processing chunk: ${key}`);
      }
      
      if (key.includes('_chunk_')) {
        // This is a chunk file - extract the base model path
        const modelKey = key.replace(/_chunk_\d+$/, '');
        if (!modelGroups.has(modelKey)) {
          modelGroups.set(modelKey, { chunks: [], totalSize: 0, chunkSizes: [] });
        }
        
        const group = modelGroups.get(modelKey)!;
        group.chunks.push(key);
        
        // Get the blob size from the item - try different possible structures
        const blobSize = extractEntrySize(item);
        
        if (blobSize > 0) {
          group.totalSize += blobSize;
          group.chunkSizes.push(blobSize);
          if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Chunk ${key}: ${blobSize} bytes`);
        } else {
          if (LOG_WARN) console.warn(prefix, `[getAllCachedModels] Could not determine size for chunk: ${key}`, item);
        }
      } else if (key.includes('_metadata')) {
        // Skip metadata files for now - we'll calculate from chunks
        if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Found metadata file: ${key}`);
      } else if ((key.startsWith('models/') || key.includes('/model.') || key.includes('/onnx/')) && !key.includes('huggingface_token')) {
        // Handle non-chunked models - be more inclusive in detection
        let modelId = '';
        let modelPath = '';
        
        if (key.startsWith('models/')) {
          // Traditional models/ path
          const pathParts = key.replace('models/', '').split('/');
          if (pathParts.length >= 2) {
            modelId = pathParts[0];
            modelPath = pathParts.slice(1).join('/');
          }
        } else if (key.includes('huggingface.co/')) {
          // HuggingFace URL format: https://huggingface.co/ModelName/repo/resolve/main/path/file.ext
          const urlParts = key.split('/');
          const modelIndex = urlParts.findIndex((part: string) => part === 'huggingface.co') + 1;
          if (modelIndex > 0 && urlParts[modelIndex]) {
            modelId = urlParts[modelIndex];
            const filePath = urlParts.slice(modelIndex + 3).join('/'); // Skip 'repo/resolve/main'
            modelPath = filePath;
          }
        }
        
        if (modelId && modelPath) {
          // Get size for non-chunked models
          let modelSize = 0;
          // Type guard: check if data is Blob (has size property)
          if (item.data && 'size' in item.data && typeof item.data.size === 'number') {
            modelSize = item.data.size;
          } else if (item.blob && item.blob.size) {
            modelSize = item.blob.size;
          } else if (item.size) {
            modelSize = item.size;
          } else if (item.data instanceof Blob) {
            modelSize = item.data.size;
          } else if (item.data instanceof Uint8Array) {
            modelSize = item.data.length;
          }
          
          models.push({
            modelId,
            modelPath,
            totalSize: modelSize,
            numChunks: 1,
            chunkSize: modelSize,
            downloadDate: new Date().toISOString(),
            cacheKey: key,
            metadataKey: key,
            chunkKeys: [key]
          });
          
          if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Non-chunked model ${key}: ${modelSize} bytes (${modelId}/${modelPath})`);
        }
      }
    }
    
    if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Found ${modelGroups.size} chunked model groups`);
    
    // Convert chunked models to CachedModelInfo
    for (const [cacheKey, data] of modelGroups) {
      if (data.chunks.length > 0) {
        // Extract model info from cache key
        const pathParts = cacheKey.replace('models/', '').split('/');
        if (pathParts.length >= 2) {
          const modelId = pathParts[0];
          const modelPath = pathParts.slice(1).join('/');
          
          // Calculate average chunk size
          const avgChunkSize = data.chunkSizes.length > 0 ? 
            Math.round(data.totalSize / data.chunkSizes.length) : 0;
          
          models.push({
            modelId,
            modelPath,
            totalSize: data.totalSize,
            numChunks: data.chunks.length,
            chunkSize: avgChunkSize,
            downloadDate: new Date().toISOString(), // We don't store this yet
            cacheKey,
            metadataKey: `${cacheKey}_metadata`,
            chunkKeys: data.chunks.sort((a, b) => {
              const aNum = parseInt(a.match(/_chunk_(\d+)$/)?.[1] || '0');
              const bNum = parseInt(b.match(/_chunk_(\d+)$/)?.[1] || '0');
              return aNum - bNum;
            })
          });
          
          if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Added model: ${modelId}/${modelPath}, ${data.chunks.length} chunks, ${(data.totalSize / 1024 / 1024).toFixed(1)}MB`);
        }
      }
    }
    
    db.close();
    
    if (LOG_DEBUG) console.log(prefix, `[getAllCachedModels] Returning ${models.length} models`);
    
  } catch (error) {
    if (LOG_ERROR) console.error(prefix, '[getAllCachedModels] Error:', error);
  }
  
  return models;
}

export async function deleteCachedModel(modelInfo: CachedModelInfo): Promise<void> {
  try {
    // Delete all chunks
    for (const chunkKey of modelInfo.chunkKeys) {
      await deleteFromIndexedDB(chunkKey);
    }
    
    // Delete metadata
    await deleteFromIndexedDB(modelInfo.metadataKey);
    
    if (LOG_GENERAL) console.log(prefix, `[deleteCachedModel] Deleted model: ${modelInfo.modelId}/${modelInfo.modelPath}`);
  } catch (error) {
    if (LOG_ERROR) console.error(prefix, '[deleteCachedModel] Error:', error);
    throw error;
  }
}

export async function deleteAllCachedModels(): Promise<void> {
  const models = await getAllCachedModels();
  for (const model of models) {
    await deleteCachedModel(model);
  }
  if (LOG_GENERAL) console.log(prefix, '[deleteAllCachedModels] Deleted all cached models');
}

export async function openModelCacheDB(): Promise<IDBDatabase> {
   if (LOG_OPEN_DB) console.log(prefix, '[openModelCacheDB] Opening ClaimAIModels DB');
    const dbName = DBNames.DB_MODELS;
    const dbConfig = modelCacheSchema[dbName];
    const storeNames = Object.keys(dbConfig.stores) as Array<keyof typeof dbConfig.stores>;
    return new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbConfig.version);
        req.onupgradeneeded = (event) => {
            const db = req.result;
            if (LOG_OPEN_DB) console.log(prefix, '[openModelCacheDB] onupgradeneeded event', event);
            for (const storeName of storeNames) {
                if (!db.objectStoreNames.contains(storeName)) {
                    const storeConfig = dbConfig.stores[storeName];
                    db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
                    if (LOG_OPEN_DB) console.log(prefix, `[openModelCacheDB] Created object store: ${storeName}`);
                } else {
                    if (LOG_OPEN_DB) console.log(prefix, `[openModelCacheDB] Object store ${storeName} already exists.`);
                }
            }
        };
        req.onsuccess = (event) => {
            if (LOG_OPEN_DB) console.log(prefix, '[openModelCacheDB] onsuccess event', event);
            if (LOG_OPEN_DB) console.log(prefix, '[openModelCacheDB] Success');
            resolve(req.result);
        };
        req.onerror = (event) => {
            if (LOG_ERROR) console.error(prefix, '[openModelCacheDB] onerror event', event);
            if (LOG_ERROR) console.error(prefix, '[openModelCacheDB] Error', req.error);
            reject(req.error);
        };
        req.onblocked = (event) => {
            if (LOG_WARN) console.warn(prefix, '[openModelCacheDB] onblocked event', event);
            reject(new Error('openModelCacheDB: DB open request was blocked.'));
        };
    });
}

export async function getFromIndexedDB(url: string): Promise<Blob | null> {
    cacheLogCount++;
    if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
        console.log(prefix, `[getFromIndexedDB] Getting ${url} (operation #${cacheLogCount})`);
    }
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.get(url);
        req.onsuccess = () => {
            if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
                console.log(prefix, `[getFromIndexedDB] Success for ${url} (operation #${cacheLogCount})`);
            }
            const result = req.result;
            resolve(result ? result.blob : null);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[getFromIndexedDB] Error for', url, req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
                console.log(prefix, `[getFromIndexedDB] Transaction complete for ${url} (operation #${cacheLogCount})`);
            }
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getFromIndexedDB] Transaction error for', url, e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getFromIndexedDB] Transaction aborted for', url, e);
            db.close();
        };
    });
}

export async function saveToIndexedDB(url: string, blob: Blob) {
   cacheLogCount++;
   if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
       console.log(prefix, `[saveToIndexedDB] Saving ${url} (operation #${cacheLogCount})`);
   }
    const db = await openModelCacheDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.put({ url, blob });
        req.onsuccess = () => {
            if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
                console.log(prefix, `[saveToIndexedDB] Saved ${url} (operation #${cacheLogCount})`);
            }
            resolve(undefined);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[saveToIndexedDB] Error saving', url, req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_CACHE && (cacheLogCount % LOG_THROTTLE_INTERVAL === 0 || cacheLogCount === 1)) {
                console.log(prefix, `[saveToIndexedDB] Transaction complete for ${url} (operation #${cacheLogCount})`);
            }
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[saveToIndexedDB] Transaction error for', url, e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[saveToIndexedDB] Transaction aborted for', url, e);
            db.close();
        };
    });
}

export async function getManifestEntry(repo: string): Promise<ManifestEntry | null> {
    manifestLogCount++;
    if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
        console.log(prefix, `[getManifestEntry] Getting ${repo} (operation #${manifestLogCount})`);
    }
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('manifest', 'readonly');
        const store = tx.objectStore('manifest');
        const req = store.get(repo);
        req.onsuccess = () => {
            if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
                console.log(prefix, `[getManifestEntry] Success for ${repo} (operation #${manifestLogCount})`);
            }
            const entry = req.result as ManifestEntry | null;
            // Check manifest version if needed in the future for migration
            if (entry && entry.manifestVersion !== CURRENT_MANIFEST_VERSION) {
                if (LOG_WARN) console.warn(prefix, `[getManifestEntry] Manifest for ${repo} has old version ${entry.manifestVersion}, current is ${CURRENT_MANIFEST_VERSION}. Consider migration or re-fetching.`);
            }
            resolve(entry || null);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[getManifestEntry] Error for', repo, req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
                console.log(prefix, `[getManifestEntry] Transaction complete for ${repo} (operation #${manifestLogCount})`);
            }
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getManifestEntry] Transaction error for', repo, e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getManifestEntry] Transaction aborted for', repo, e);
            db.close();
        };
    });
}

export async function addManifestEntry(repo: string, entry: ManifestEntry): Promise<void> {
    if (!entry || typeof entry !== 'object' || entry.repo !== repo) {
        if (LOG_ERROR) console.error(prefix, `[addManifestEntry] Invalid entry for repo ${repo}:`, entry);
        throw new Error(`[addManifestEntry] Invalid entry: must be an object with repo === ${repo}`);
    }
    if (entry.manifestVersion !== CURRENT_MANIFEST_VERSION) {
         if (LOG_WARN) console.warn(prefix, `[addManifestEntry] Attempting to save manifest for ${repo} with version ${entry.manifestVersion}, but current is ${CURRENT_MANIFEST_VERSION}.`);
         // Ensure we always save with the current version, or throw error if strictness is required
         entry.manifestVersion = CURRENT_MANIFEST_VERSION;
    }
    manifestLogCount++;
    if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
        console.log(prefix, `[addManifestEntry] Adding/Updating ${repo} (operation #${manifestLogCount})`);
    }
    const db = await openModelCacheDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('manifest', 'readwrite');
        const store = tx.objectStore('manifest');
        const req = store.put(entry);
        req.onsuccess = () => {
            if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
                console.log(prefix, `[addManifestEntry] Added/Updated ${repo} (operation #${manifestLogCount})`);
            }
            resolve();
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[addManifestEntry] Error for', repo, req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_MANIFEST && (manifestLogCount % LOG_THROTTLE_INTERVAL === 0 || manifestLogCount === 1)) {
                console.log(prefix, `[addManifestEntry] Transaction complete for ${repo} (operation #${manifestLogCount})`);
            }
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[addManifestEntry] Transaction error for', repo, e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[addManifestEntry] Transaction aborted for', repo, e);
            db.close();
        };
    });
}

export async function fetchRepoFiles(
  repo: string
): Promise<{ siblings: HuggingFaceSibling[]; task: string }> {
    if (LOG_GENERAL) console.log(prefix, '[fetchRepoFiles] Fetching', repo);
    const url = `https://huggingface.co/api/models/${repo}`;
    try {
        const headers = await getAuthenticatedHeaders();
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            if (LOG_ERROR) console.error(prefix, '[fetchRepoFiles] Failed for', repo, resp.status, resp.statusText);
            throw new Error(`Failed to fetch repo files for ${repo}: ${resp.status} ${resp.statusText}`);
        }
        const json = (await resp.json()) as HuggingFaceModelMetadata;
        if (LOG_DEBUG) console.log(prefix, '[fetchRepoFiles] Success for', repo, json);
        const siblings = Array.isArray(json.siblings)
          ? json.siblings.filter(
              (entry): entry is HuggingFaceSibling =>
                typeof (entry as HuggingFaceSibling | null)?.rfilename === 'string'
            )
          : [];
        const baseRepoUrl = `https://huggingface.co/${repo}/resolve/main/`;
        // Ensure every file has .size (use HEAD if missing/invalid)
        await Promise.all(
          siblings.map(async (entry) => {
            if (typeof entry.size !== 'number' || !Number.isFinite(entry.size) || entry.size <= 0) {
              const entryUrl = baseRepoUrl + entry.rfilename;
              try {
                const headResp = await fetch(entryUrl, { method: 'HEAD' });
                if (headResp.ok) {
                  const len = headResp.headers.get('Content-Length');
                  if (len) entry.size = parseInt(len, 10);
                }
              } catch (e) {
                if (LOG_WARN) console.warn(prefix, `[fetchRepoFiles] HEAD request failed for ${entryUrl}:`, e);
              }
            }
          })
        );
        return { siblings, task: json.pipeline_tag || 'text-generation' };
    } catch (err) {
        if (LOG_ERROR) console.error(prefix, '[fetchRepoFiles] Exception for', repo, err);
        throw err;
    }
}

export function parseQuantFromFilename(filename: string): string | null {
    if (LOG_GENERAL) console.log(prefix, '[parseQuantFromFilename] Parsing', filename);
    const match = filename.match(/model_([a-z0-9_]+)\.onnx$/i);
    const quant = match ? match[1] : null;
    if (LOG_DEBUG) console.log(prefix, '[parseQuantFromFilename] Result for', filename, 'is', quant);
    return quant;
}

export async function fetchModelMetadataInternal(modelId: string) {
    const apiUrl = `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`;
    if (LOG_GENERAL) console.log(prefix, `[fetchModelMetadataInternal] Fetching model metadata from: ${apiUrl}`);
    try {
        const headers = await getAuthenticatedHeaders();
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            if (LOG_ERROR) console.error(prefix, `[fetchModelMetadataInternal] Failed to fetch model file list for ${modelId}: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`[fetchModelMetadataInternal] Metadata fetch failed (${response.status}): ${response.statusText}`);
        }
        const metadata = await response.json();
        if (LOG_GENERAL) console.log(prefix, `[fetchModelMetadataInternal] Model metadata fetched successfully for ${modelId}.`);
        return metadata;
    } catch (error) {
        if (LOG_ERROR) console.error(prefix, `[fetchModelMetadataInternal] Error fetching metadata for ${modelId}:`, error);
        throw error;
    }
}

export async function filterAndValidateFilesInternal(
  metadata: HuggingFaceModelMetadata,
  modelId: string,
  baseRepoUrl: string
): Promise<{ neededFileEntries: NeededFileEntry[]; message: string | null }> {
    const hfFileEntries = Array.isArray(metadata.siblings)
      ? metadata.siblings.filter(
          (entry): entry is HuggingFaceSibling =>
            typeof entry.rfilename === 'string'
        )
      : [];
    const filteredEntries = hfFileEntries.filter(
      (f) =>
        f.rfilename.endsWith('.onnx') || f.rfilename.endsWith('on') || f.rfilename.endsWith('.txt')
    );

    if (filteredEntries.length === 0) {
        return { neededFileEntries: [], message: "No .onnx, on, or .txt files found in model metadata." };
    }

    async function getFileSizeWithHEAD(url: string) {
        try {
            const headResp = await fetch(url, { method: 'HEAD' });
            if (headResp.ok) {
                const len = headResp.headers.get('Content-Length');
                return len ? parseInt(len, 10) : null;
            }
        } catch (e) {
            if (LOG_WARN) console.warn(prefix, `[filterAndValidateFilesInternal] HEAD request failed for ${url}:`, e);
        }
        return null;
    }

    const sizePromises = filteredEntries.map(async (entry) => {
        if (typeof entry.size !== 'number' || !isFinite(entry.size) || entry.size <= 0) {
            const url = baseRepoUrl + entry.rfilename;
            const size = await getFileSizeWithHEAD(url);
            if (size && isFinite(size) && size > 0) {
                entry.size = size;
            } else {
                entry.skip = true;
            }
        }
    });

    await Promise.all(sizePromises);
    const neededFileEntries = filteredEntries
      .filter((e) => !e.skip)
      .map<NeededFileEntry>((entry) => {
        const fileName = entry.rfilename;
        const fileType = fileName.split('.').pop();
        const size = typeof entry.size === 'number' ? entry.size : 0;
        const totalChunks =
          size > 0 ? Math.ceil(size / (10 * 1024 * 1024)) : 0;
        const chunkGroupId = `${modelId}/${fileName}`;
        return {
            id: `${chunkGroupId}:manifest`,
            type: 'manifest',
            chunkGroupId,
            fileName,
            folder: modelId,
            fileType,
            size,
            totalChunks,
            chunkSizeUsed: 10 * 1024 * 1024,
            status: 'missing',
            addedAt: Date.now(),
        };
    });
    return { neededFileEntries, message: null };
}

export async function getAllManifestEntries(): Promise<ManifestEntry[]> {
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('manifest', 'readonly');
        const store = tx.objectStore('manifest');
        const req = store.getAll();
        req.onsuccess = () => {
            if (LOG_DEBUG) console.log(prefix, '[getAllManifestEntries] result:', req.result);
            const entries = (req.result || []) as ManifestEntry[];
            // Optionally filter or migrate entries based on manifestVersion here if needed
            resolve(entries);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[getAllManifestEntries] error:', req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_DEBUG) console.log(prefix, '[getAllManifestEntries] transaction complete');
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getAllManifestEntries] transaction error:', e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getAllManifestEntries] transaction aborted:', e);
            db.close();
        };
    });
}

export async function saveInferenceSettings(settings: InferenceSettings) {
    const db = await openModelCacheDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('inferenceSettings', 'readwrite');
        const store = tx.objectStore('inferenceSettings');
        const req = store.put({ id: INFERENCE_SETTINGS_SINGLETON_ID, ...settings });
        req.onsuccess = () => {
            if (LOG_INFERENCE_SETTINGS) console.log(prefix, '[saveInferenceSettings] success:', settings);
            resolve();
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[saveInferenceSettings] error:', req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_INFERENCE_SETTINGS) console.log(prefix, '[saveInferenceSettings] transaction complete');
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[saveInferenceSettings] transaction error:', e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[saveInferenceSettings] transaction aborted:', e);
            db.close();
        };
    });
}

export async function getInferenceSettings(): Promise<InferenceSettings | null> {
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('inferenceSettings', 'readonly');
        const store = tx.objectStore('inferenceSettings');
        const req = store.get(INFERENCE_SETTINGS_SINGLETON_ID);
        req.onsuccess = () => {
            if (LOG_INFERENCE_SETTINGS) console.log(prefix, '[getInferenceSettings] result:', req.result);
            resolve(req.result || null);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[getInferenceSettings] error:', req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_INFERENCE_SETTINGS) console.log(prefix, '[getInferenceSettings] transaction complete');
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getInferenceSettings] transaction error:', e);
            db.close();
        };
        tx.onabort = (e) => {
            if (LOG_ERROR) console.error(prefix, '[getInferenceSettings] transaction aborted:', e);
            db.close();
        };
    });
}

/**
 * Get inference settings for a specific model+quant combo
 * Returns null if no custom settings exist (fall back to defaults)
 * @param repo - Repository ID (e.g., "onnx-community/Phi-3.5-mini-instruct-onnx-web")
 * @param quantPath - Quantization path (e.g., "onnx/model_q4f16.onnx")
 */
export async function getModelQuantSettings(repo: string, quantPath: string): Promise<InferenceSettings | null> {
    if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[getModelQuantSettings] Getting settings for ${repo}:${quantPath}`);
    
    const manifest = await getManifestEntry(repo);
    if (!manifest || !manifest.quants[quantPath]) {
        if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[getModelQuantSettings] No manifest entry for ${repo}:${quantPath}`);
        return null;
    }
    
    const quantInfo = manifest.quants[quantPath];
    const settings = quantInfo.inferenceSettings || null;
    
    if (LOG_INFERENCE_SETTINGS) {
        console.log(prefix, `[getModelQuantSettings] Settings for ${repo}:${quantPath}:`, settings ? 'Custom settings found' : 'No custom settings, will use defaults');
    }
    
    return settings;
}

/**
 * Save inference settings for a specific model+quant combo
 * @param repo - Repository ID
 * @param quantPath - Quantization path
 * @param settings - Inference settings to save
 */
export async function saveModelQuantSettings(repo: string, quantPath: string, settings: InferenceSettings): Promise<void> {
    if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[saveModelQuantSettings] Saving settings for ${repo}:${quantPath}`, settings);
    
    let manifest = await getManifestEntry(repo);
    if (!manifest) {
        if (LOG_WARN) console.warn(prefix, `[saveModelQuantSettings] No manifest for ${repo}, creating one`);
        manifest = {
            repo,
            quants: {},
            manifestVersion: CURRENT_MANIFEST_VERSION,
        };
    }
    
    if (!manifest.quants[quantPath]) {
        if (LOG_WARN) console.warn(prefix, `[saveModelQuantSettings] No quant entry for ${quantPath}, creating one`);
        manifest.quants[quantPath] = {
            files: [quantPath],
            status: QuantStatus.Available,
            dtype: extractCleanDtype(quantPath),
            hasExternalData: false,
        };
    }
    
    // Save settings to the quant entry
    manifest.quants[quantPath].inferenceSettings = settings;
    
    await addManifestEntry(repo, manifest);
    
    if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[saveModelQuantSettings] Successfully saved settings for ${repo}:${quantPath}`);
}

/**
 * Clear/reset inference settings for a specific model+quant combo
 * This makes the model fall back to global defaults
 * @param repo - Repository ID
 * @param quantPath - Quantization path
 */
export async function clearModelQuantSettings(repo: string, quantPath: string): Promise<void> {
    if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[clearModelQuantSettings] Clearing settings for ${repo}:${quantPath}`);
    
    const manifest = await getManifestEntry(repo);
    if (!manifest || !manifest.quants[quantPath]) {
        if (LOG_WARN) console.warn(prefix, `[clearModelQuantSettings] No manifest/quant entry for ${repo}:${quantPath}`);
        return;
    }
    
    // Remove the settings (falls back to defaults)
    delete manifest.quants[quantPath].inferenceSettings;
    
    await addManifestEntry(repo, manifest);
    
    if (LOG_INFERENCE_SETTINGS) console.log(prefix, `[clearModelQuantSettings] Successfully cleared settings for ${repo}:${quantPath}`);
}

/**
 * Add or update a quant (modelPath) in the manifest for a repo, setting its status.
 * If the quant already exists, update its status. If not, add it with an empty files array.
 * Optionally, you can pass a files array to set required files, otherwise it will keep existing or set to [modelPath].
 */
export async function addQuantToManifest(repo: string, modelPath: string, status: QuantStatus, files?: string[]): Promise<void> {
    let manifest = await getManifestEntry(repo);
    if (!manifest) {
        manifest = {
            repo,
            quants: {},
            manifestVersion: CURRENT_MANIFEST_VERSION,
        };
    }
    if (!manifest.quants[modelPath]) {
        manifest.quants[modelPath] = {
            files: files && files.length ? files : [modelPath],
            status,
            dtype: extractCleanDtype(modelPath),
            hasExternalData: false, // Default to false, will be updated when needed
        };
    } else {
        manifest.quants[modelPath].status = status;
        if (files && files.length) {
            manifest.quants[modelPath].files = files;
        }
        // Ensure dtype is set for existing entries
        if (!manifest.quants[modelPath].dtype) {
            manifest.quants[modelPath].dtype = extractCleanDtype(modelPath);
        }
        // Ensure hasExternalData is set for existing entries
        if (manifest.quants[modelPath].hasExternalData === undefined) {
            manifest.quants[modelPath].hasExternalData = false;
        }
    }
    await addManifestEntry(repo, manifest);
}

export async function deleteFromIndexedDB(url: string) {
    if (LOG_GENERAL) console.log(prefix, '[deleteFromIndexedDB] Deleting', url);
    const db = await openModelCacheDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.delete(url);
        req.onsuccess = () => {
            if (LOG_DEBUG) console.log(prefix, '[deleteFromIndexedDB] Deleted', url);
            resolve(undefined);
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[deleteFromIndexedDB] Error deleting', url, req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            if (LOG_DEBUG) console.log(prefix, '[deleteFromIndexedDB] Transaction complete for', url);
            db.close();
        };
        tx.onerror = (e) => {
            if (LOG_ERROR) console.error(prefix, '[deleteFromIndexedDB] Transaction error for', url, e);
            db.close();
        };
    });
}

// ===== CHUNKED FILE MANAGEMENT FUNCTIONS =====

/**
 * Fetch a single chunk from IndexedDB
 */
export async function fetchChunk(modelId: string, fileName: string, chunkIndex: number): Promise<ArrayBuffer | null> {
    try {
        const chunkKey = `${modelId}/${fileName}_chunk_${chunkIndex}`;
        const cached = await getFromIndexedDB(chunkKey);
        
        if (cached) {
            return await cached.arrayBuffer();
        } else {
            if (LOG_DEBUG) console.log(prefix, `[fetchChunk] Chunk ${chunkIndex} not found in cache`);
            return null;
        }
    } catch (error) {
        if (LOG_ERROR) console.error(prefix, `[fetchChunk] Error fetching chunk ${chunkIndex} for ${modelId}/${fileName}:`, error);
        return null;
    }
}

/**
 * Get chunk info for a file
 */
export async function getChunkInfo(modelId: string, fileName: string): Promise<{ isChunked: boolean; totalChunks?: number; totalSize?: number }> {
    try {
        const manifestKey = `${modelId}/${fileName}:manifest`;
        const manifest = await getFromIndexedDB(manifestKey);
        
        if (manifest) {
            const manifestData = await manifest.text();
            const manifestObj = JSON.parse(manifestData);
            
            if (manifestObj.type === 'manifest' && manifestObj.totalChunks > 0) {
                return {
                    isChunked: true,
                    totalChunks: manifestObj.totalChunks,
                    totalSize: manifestObj.size
                };
            }
        }
        
        return { isChunked: false };
    } catch (error) {
        if (LOG_ERROR) console.error(prefix, `[getChunkInfo] Error checking chunked status for ${modelId}/${fileName}:`, error);
        return { isChunked: false };
    }
}

/**
 * Assemble chunks into a complete file
 */
export async function assembleChunks(modelId: string, fileName: string, totalChunks: number, totalSize: number): Promise<ArrayBuffer> {
    if (LOG_DEBUG) console.log(prefix, `[assembleChunks] Assembling ${totalChunks} chunks for ${fileName}, total size: ${totalSize} bytes`);
    
    const combined = new Uint8Array(totalSize);
    let currentOffset = 0;
    
    for (let i = 0; i < totalChunks; i++) {
        const chunkArrayBuffer = await fetchChunk(modelId, fileName, i);
        if (!chunkArrayBuffer) {
            throw new Error(`Failed to fetch chunk ${i} of ${fileName}`);
        }
        
        const chunkUint8Array = new Uint8Array(chunkArrayBuffer);
        if (currentOffset + chunkUint8Array.length > totalSize) {
            throw new Error(`Chunk ${i} would overflow buffer for ${fileName}. Offset: ${currentOffset}, ChunkLen: ${chunkUint8Array.length}, TotalSize: ${totalSize}`);
        }
        
        combined.set(chunkUint8Array, currentOffset);
        currentOffset += chunkUint8Array.length;
        
        if (i % 20 === 0 || i === totalChunks - 1) {
            if (LOG_DEBUG) console.log(prefix, `[assembleChunks] Assembled chunk ${i}/${totalChunks-1}. Offset: ${currentOffset}/${totalSize}`);
        }
    }
    
    if (currentOffset !== totalSize) {
        if (LOG_WARN) console.warn(prefix, `[assembleChunks] Assembled size ${currentOffset} mismatch expected ${totalSize} for ${fileName}`);
        return combined.buffer.slice(0, currentOffset);
    }
    
    return combined.buffer;
}

/**
 * Save a large file as chunks in IndexedDB (RAM-efficient streaming version)
 * This version streams the file in chunks without loading the entire file into RAM
 */
export async function saveChunkedFileSafe(resourceUrl: string, blob: Blob, modelId: string): Promise<void> {
    // Extract the full file path from the URL (e.g., "onnx/model_q4f16.onnx")
    const urlParts = resourceUrl.split('/');
    const fileName = urlParts.slice(urlParts.indexOf('main') + 1).join('/'); // Get everything after '/main/'
    
    if (!modelId) {
        throw new Error('No model ID available for chunked storage');
    }
    
    const fileSize = blob.size;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    
    if (LOG_CHUNKS) console.log(prefix, `[saveChunkedFileSafe] Starting chunking ${fileName}: ${fileSize} bytes into ${totalChunks} chunks (last chunk will be ${fileSize % CHUNK_SIZE} bytes)`);
    
    // Create manifest
    const manifest = {
        id: `${modelId}/${fileName}:manifest`,
        type: 'manifest',
        chunkGroupId: `${modelId}/${fileName}`,
        fileName,
        totalChunks,
        chunkSizeUsed: CHUNK_SIZE,
        size: fileSize,
        status: 'present'
    };
    
    // Save manifest
    await saveToIndexedDB(`${modelId}/${fileName}:manifest`, new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
    
    // Stream the blob in chunks without loading entire file into RAM
    const stream = blob.stream();
    const reader = stream.getReader();
    let chunkIndex = 0;
    let totalBytesProcessed = 0;
    const currentChunkBuffer = new Uint8Array(CHUNK_SIZE);
    let currentChunkOffset = 0;
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Process this chunk of data
            const chunkData = new Uint8Array(value);
            let dataOffset = 0;
            
            while (dataOffset < chunkData.length) {
                const remainingInChunk = CHUNK_SIZE - currentChunkOffset;
                const remainingInData = chunkData.length - dataOffset;
                const bytesToCopy = Math.min(remainingInChunk, remainingInData);
                
                // Copy data to current chunk buffer
                currentChunkBuffer.set(chunkData.slice(dataOffset, dataOffset + bytesToCopy), currentChunkOffset);
                currentChunkOffset += bytesToCopy;
                dataOffset += bytesToCopy;
                
                // If chunk is full, save it
                if (currentChunkOffset === CHUNK_SIZE) {
                    const chunkKey = `${modelId}/${fileName}_chunk_${chunkIndex}`;
                    const actualChunkSize = currentChunkOffset;
                    
                    // Save the exact chunk data
                    await saveToIndexedDB(chunkKey, new Blob([currentChunkBuffer.slice(0, actualChunkSize)], { type: 'application/octet-stream' }));
                    
                    totalBytesProcessed += actualChunkSize;
                    chunkIndex++;
                    currentChunkOffset = 0;
                    
                    // Log every 20 chunks or on the last chunk
                    if (chunkIndex % 20 === 0 || chunkIndex === totalChunks) {
                        if (LOG_CHUNKS) {
                            const startChunk = Math.max(0, chunkIndex - 20);
                            const endChunk = chunkIndex - 1;
                            if (startChunk === endChunk) {
                                console.log(prefix, `[saveChunkedFileSafe] Chunk ${startChunk} saved (${actualChunkSize} bytes, total: ${totalBytesProcessed}/${fileSize})`);
                            } else {
                                console.log(prefix, `[saveChunkedFileSafe] Chunks ${startChunk}-${endChunk} saved (${actualChunkSize} bytes, total: ${totalBytesProcessed}/${fileSize})`);
                            }
                        }
                    }
                }
            }
        }
        
        // CRITICAL FIX: Save the last chunk if there's remaining data
        if (currentChunkOffset > 0) {
            const chunkKey = `${modelId}/${fileName}_chunk_${chunkIndex}`;
            const actualChunkSize = currentChunkOffset;
            
            // Save the last chunk with remaining data
            await saveToIndexedDB(chunkKey, new Blob([currentChunkBuffer.slice(0, actualChunkSize)], { type: 'application/octet-stream' }));
            
            totalBytesProcessed += actualChunkSize;
            chunkIndex++;
            
            if (LOG_CHUNKS) console.log(prefix, `[saveChunkedFileSafe] Streamed final chunk ${chunkIndex}/${totalChunks} (${actualChunkSize} bytes, total: ${totalBytesProcessed}/${fileSize})`);
        }
        
        if (LOG_CHUNKS) console.log(prefix, `[saveChunkedFileSafe] ✅ Successfully streamed ${fileName}: ${chunkIndex} chunks saved`);
        
    } catch (error) {
        if (LOG_ERROR) console.error(prefix, `[saveChunkedFileSafe] Error during streaming chunking:`, error);
        throw error;
    } finally {
        reader.releaseLock();
    }
}

/**
 * Create a streaming response from chunks (RAM-efficient for large files)
 * This creates a ReadableStream that yields chunks without loading entire file into RAM
 */
export async function createStreamingResponseFromChunks(modelId: string, fileName: string, totalChunks: number, totalSize: number): Promise<Response> {
    const stream = new ReadableStream({
        async start(controller) {
            try {
                let totalBytesStreamed = 0;
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunkArrayBuffer = await fetchChunk(modelId, fileName, i);
                    if (!chunkArrayBuffer) {
                        throw new Error(`Failed to fetch chunk ${i} of ${fileName}`);
                    }
                    
                    // Create a proper Uint8Array from the chunk
                    const chunkData = new Uint8Array(chunkArrayBuffer);
                    totalBytesStreamed += chunkData.length;
                    
                    // Enqueue the chunk data
                    controller.enqueue(chunkData);
                    
                    // Log every 20 chunks or on the last chunk
                    if (i % 20 === 0 || i === totalChunks - 1) {
                        if (LOG_CHUNKS) {
                            const startChunk = Math.max(0, i - 19);
                            const endChunk = i;
                            if (startChunk === endChunk) {
                                console.log(prefix, `[createStreamingResponseFromChunks] Chunk ${startChunk} streamed (${chunkData.length} bytes, total: ${totalBytesStreamed}/${totalSize})`);
                            } else {
                                console.log(prefix, `[createStreamingResponseFromChunks] Chunks ${startChunk}-${endChunk} streamed (${chunkData.length} bytes, total: ${totalBytesStreamed}/${totalSize})`);
                            }
                        }
                    }
                }
                
                if (LOG_GENERAL) console.log(prefix, `[createStreamingResponseFromChunks] ✅ Completed streaming ${fileName}: ${totalBytesStreamed} bytes (expected: ${totalSize} bytes)`);
                
                // Validate total bytes match
                if (totalBytesStreamed !== totalSize) {
                    if (LOG_WARN) console.warn(prefix, `[createStreamingResponseFromChunks] ⚠️ Size mismatch: streamed ${totalBytesStreamed} bytes, expected ${totalSize} bytes`);
                }
                
                controller.close();
            } catch (error) {
                if (LOG_ERROR) console.error(prefix, `[createStreamingResponseFromChunks] Error streaming chunks:`, error);
                controller.error(error);
            }
        }
    });
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Length', totalSize.toString());
    headers.set('Transfer-Encoding', 'chunked');
    
    return new Response(stream, { headers });
}

// ============================================================================
// User-Added Models Management
// ============================================================================

export type UserAddedModel = {
    repo: string; // HuggingFace repo ID
    displayName: string; // User-friendly name
    task: string; // e.g., "text-generation"
    addedAt: number; // Timestamp
    isUserAdded: true; // Flag to distinguish from defaults
};

/**
 * Save a user-added model to IndexedDB
 */
export async function saveUserAddedModel(model: Omit<UserAddedModel, 'addedAt' | 'isUserAdded'>): Promise<void> {
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('manifest', 'readwrite');
        const store = tx.objectStore('manifest');
        
        const userModel: ManifestEntry = {
            repo: model.repo,
            quants: {}, // Will be populated when model is actually loaded
            task: model.task,
            manifestVersion: CURRENT_MANIFEST_VERSION,
        };
        
        const req = store.put(userModel);
        req.onsuccess = () => {
            if (LOG_DEBUG) console.log(prefix, '[saveUserAddedModel] success:', model.repo);
            resolve();
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[saveUserAddedModel] error:', req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            db.close();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

/**
 * Remove a user-added model from IndexedDB
 */
export async function removeUserAddedModel(repo: string): Promise<void> {
    const db = await openModelCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('manifest', 'readwrite');
        const store = tx.objectStore('manifest');
        
        const req = store.delete(repo);
        req.onsuccess = () => {
            if (LOG_DEBUG) console.log(prefix, '[removeUserAddedModel] success:', repo);
            resolve();
        };
        req.onerror = () => {
            if (LOG_ERROR) console.error(prefix, '[removeUserAddedModel] error:', req.error);
            reject(req.error);
        };
        tx.oncomplete = () => {
            db.close();
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

/**
 * Get all user-added models (those not in AVAILABLE_MODELS)
 */
export async function getUserAddedModels(defaultModels: Set<string>): Promise<ManifestEntry[]> {
    const allManifests = await getAllManifestEntries();
    return allManifests.filter(manifest => !defaultModels.has(manifest.repo));
}

/**
 * Validate if a HuggingFace model exists and has ONNX files
 */
export async function validateHuggingFaceModel(repoId: string): Promise<{
    valid: boolean;
    error?: string;
    task?: string;
    onnxFiles?: string[];
}> {
    try {
        // Fetch model info from HuggingFace API
        const response = await fetch(`https://huggingface.co/api/models/${repoId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return { valid: false, error: 'Model not found on HuggingFace' };
            }
            return { valid: false, error: `API error: ${response.status}` };
        }
        
        const modelInfo = (await response.json()) as HuggingFaceModelMetadata;
        
        // Check if model has ONNX files
        const filesResponse = await fetch(`https://huggingface.co/api/models/${repoId}/tree/main`);
        if (!filesResponse.ok) {
            return { valid: false, error: 'Could not fetch model files' };
        }
        
        const files = (await filesResponse.json()) as HuggingFaceTreeFile[];
        const onnxFiles = files
          .filter((file): file is HuggingFaceTreeFile & { path: string } => typeof file.path === 'string')
          .filter((file) => file.path.endsWith('.onnx'))
          .map((file) => file.path);
        
        if (onnxFiles.length === 0) {
            return { 
                valid: false, 
                error: 'No ONNX files found. Only ONNX models are supported by Transformers.js' 
            };
        }
        
        // Extract task from model info
        const task = modelInfo.pipeline_tag || 'text-generation';
        
        return {
            valid: true,
            task,
            onnxFiles
        };
        
    } catch (error) {
        if (LOG_ERROR) console.error(prefix, '[validateHuggingFaceModel] error:', error);
        return { 
            valid: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
}

