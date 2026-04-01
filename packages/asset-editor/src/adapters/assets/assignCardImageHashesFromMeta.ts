import JSON5 from 'json5';
import { listDir, loadAsset } from '@/adapters/assets/TauriAssetAdapter';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

function normalizeFolderPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/') ? normalized.slice('Resources/'.length) : normalized;
}

function resolveImagesFolderPath(
  imagesFolderPath: string,
  resolveRelativeTo?: string
): string {
  const path = imagesFolderPath.replace(/\\/g, '/').trim();
  const looksRelative = !path.startsWith('Resources/') && !path.includes('/');
  if (looksRelative && resolveRelativeTo) {
    const base = resolveRelativeTo.replace(/\\/g, '/');
    const parentDir = base.replace(/\/[^/]+$/, '');
    const resolved = parentDir ? `${parentDir}/${path}` : path;
    return resolved.startsWith('Resources/') ? resolved : `Resources/${resolved}`;
  }
  return path.startsWith('Resources/') ? path : `Resources/${path}`;
}

interface MetaContent {
  imageHash?: string;
  checksum?: string;
}

export async function getImageHashesFromMetaFolder(
  imagesFolderPath: string,
  options?: { resolveRelativeTo?: string }
): Promise<Map<string, ImageHash>> {
  const resolved = resolveImagesFolderPath(imagesFolderPath, options?.resolveRelativeTo);
  const folder = normalizeFolderPath(resolved);
  const entries = await listDir(folder);
  const metaFiles = entries.filter(
    (e) => !e.is_dir && e.name.toLowerCase().endsWith('.meta')
  );

  const hashMap = new Map<string, ImageHash>();

  for (const entry of metaFiles) {
    const metaPath = `${folder}/${entry.name}`;
    try {
      const res = await loadAsset({ path: metaPath });
      const text = await res.text();
      const parsed = JSON5.parse(text) as MetaContent;
      const hash = parsed.imageHash ?? parsed.checksum;
      if (typeof hash === 'string' && hash.length > 0) {
        const filename = entry.name.replace(/\.meta$/i, '');
        hashMap.set(filename, hash as ImageHash);
      }
    } catch {
      continue;
    }
  }

  return hashMap;
}
