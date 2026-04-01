import path from 'node:path';

export const DEFAULT_ASSET_SOURCE_ROOT = path.join('packages', 'asset-editor', 'Resources');

export function resolveAssetSourceRoot(baseDir: string, explicitPath?: string | null): string {
  const configuredPath =
    explicitPath ||
    process.env.OCENTRA_ASSET_SOURCE_ROOT ||
    process.env.ASSET_SOURCE_ROOT ||
    process.env.ASSET_SYNC_ROOT ||
    DEFAULT_ASSET_SOURCE_ROOT;

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(baseDir, configuredPath);
}
