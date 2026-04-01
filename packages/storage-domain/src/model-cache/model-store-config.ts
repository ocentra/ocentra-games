export const MODEL_STORE_NAMES = {
  FILES: 'files',
  MANIFEST: 'manifest',
  INFERENCE_SETTINGS: 'inferenceSettings',
} as const;

export const MODEL_KEY_PATHS = {
  URL: 'url',
  REPO: 'repo',
  ID: 'id',
} as const;

export const CURRENT_MANIFEST_VERSION = 1;

export const CHUNK_SIZE = 100 * 1024 * 1024;

const HF_BASE = 'https://huggingface.co';

export function buildCacheUrl(repo: string, path: string): string {
  return `${HF_BASE}/${repo}/resolve/main/${path}`;
}

export function extractDtypeFromPath(filePath: string): string {
  const match = filePath.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}
