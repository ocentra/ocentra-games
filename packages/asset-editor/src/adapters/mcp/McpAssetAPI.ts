import { createHash } from 'node:crypto';
import { writeFile, unlink, readFile, rename as renameFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { HasAssetTypeEvent } from '@ocentra/eventing-domain/events/assets/HasAssetTypeEvent';
import { CreateAssetTemplateEvent } from '@ocentra/eventing-domain/events/assets/CreateAssetTemplateEvent';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { EnsureMetaFileEvent } from '@ocentra/eventing-domain/events/assets/EnsureMetaFileEvent';
import { ReadMetaFileEvent } from '@ocentra/eventing-domain/events/assets/ReadMetaFileEvent';
import { UpdateMetaOnSaveEvent } from '@ocentra/eventing-domain/events/assets/UpdateMetaOnSaveEvent';
import { MarkAssetDirtyEvent } from '@ocentra/eventing-domain/events/assets/MarkAssetDirtyEvent';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

function getResourcesBaseDir(): string {
  const cwd = process.cwd();
  if (cwd.includes('asset-editor')) {
    return join(cwd, 'Resources');
  }
  return join(cwd, 'packages', 'asset-editor', 'Resources');
}

export class McpAssetAPI {
  private static _resourcesBaseDir: string | null = null;

  static get resourcesBaseDir(): string {
    if (this._resourcesBaseDir !== null) {
      return this._resourcesBaseDir;
    }
    return getResourcesBaseDir();
  }

  static setResourcesBaseDir(dir: string): void {
    this._resourcesBaseDir = dir;
  }

  static resetResourcesBaseDir(): void {
    this._resourcesBaseDir = null;
  }

  private static toResourcesPath(relativePath: string): string {
    const clean = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
    return `/${clean}`;
  }

  private static async ensureMetaFile(assetPath: string, assetType?: string): Promise<string> {
    try {
      const generateDeferred = new OperationDeferred<string>();
      await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(generateDeferred));
      const generateResult = await generateDeferred.promise;
      const guid = generateResult.isSuccess && generateResult.value ? generateResult.value : null;

      if (!guid) {
        throw new Error('Failed to generate GUID for meta file');
      }

      const registerDeferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new RegisterGuidEvent(guid, registerDeferred));
      await registerDeferred.promise;

      const ensureDeferred = new OperationDeferred<string | null>();
      await EventBus.instance.publishAsync(new EnsureMetaFileEvent(guid, assetType, ensureDeferred));
      const ensureResult = await ensureDeferred.promise;
      if (!ensureResult.isSuccess || !ensureResult.value) {
        throw new Error(ensureResult.errorMessage || 'Failed to ensure meta file');
      }
      return guid;
    } catch (error) {
      logWarn(`Failed to create .meta file for ${assetPath}:`, error);
      return '';
    }
  }

  static async createAsset(
    assetType: string,
    relativePath: string,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      const hasAssetTypeDeferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new HasAssetTypeEvent(assetType, hasAssetTypeDeferred));
      const hasResult = await hasAssetTypeDeferred.promise;
      if (!hasResult.isSuccess || !hasResult.value) {
        return {
          success: false,
          path: '',
          error: `Unknown asset type: ${assetType}`,
        };
      }

      const normalizedPath = relativePath.replace(/^\/+/, '');
      const fullPath = join(this.resourcesBaseDir, normalizedPath);

      if (existsSync(fullPath)) {
        return {
          success: false,
          path: normalizedPath,
          error: `Asset already exists: ${normalizedPath}`,
        };
      }

      let assetData: Record<string, unknown> | undefined = data;
      if (!assetData) {
        const createTemplateDeferred = new OperationDeferred<Record<string, unknown> | null>();
        await EventBus.instance.publishAsync(new CreateAssetTemplateEvent(assetType, createTemplateDeferred));
        const templateResult = await createTemplateDeferred.promise;
        assetData = templateResult.isSuccess && templateResult.value ? templateResult.value : undefined;
      }
      if (!assetData) {
        return {
          success: false,
          path: normalizedPath,
          error: `Failed to create template for ${assetType}`,
        };
      }

      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(fullPath, JSON.stringify(assetData, null, 2), 'utf-8');

      const guid = await this.ensureMetaFile(normalizedPath, assetType);
      if (guid) {
        const registerDeferred = new OperationDeferred<boolean>();
        await EventBus.instance.publishAsync(new RegisterGuidEvent(guid, registerDeferred));
        await registerDeferred.promise;

        await EventBus.instance.publishAsync(new MarkAssetDirtyEvent(guid));
      }

      return {
        success: true,
        path: normalizedPath,
      };
    } catch (error) {
      logError('Create asset failed:', error);
      return {
        success: false,
        path: relativePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async deleteAsset(relativePath: string): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      const normalizedPath = relativePath.replace(/^\/+/, '');
      const fullPath = join(this.resourcesBaseDir, normalizedPath);

      if (!existsSync(fullPath)) {
        return {
          success: false,
          path: normalizedPath,
          error: `Asset not found: ${normalizedPath}`,
        };
      }

      await unlink(fullPath);

      const metaPath = `${fullPath}.meta`;
      if (existsSync(metaPath)) {
        try {
          await unlink(metaPath);
        } catch (error) {
          logWarn(`Failed to delete .meta file for ${normalizedPath}:`, error);
        }
      }

      return {
        success: true,
        path: normalizedPath,
      };
    } catch (error) {
      logError('Delete asset failed:', error);
      return {
        success: false,
        path: relativePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async duplicateAsset(
    sourcePath: string,
    targetPath: string
  ): Promise<{ success: boolean; sourcePath: string; targetPath: string; error?: string }> {
    try {
      const normalizedSource = sourcePath.replace(/^\/+/, '');
      const normalizedTarget = targetPath.replace(/^\/+/, '');

      const fullSourcePath = join(this.resourcesBaseDir, normalizedSource);
      const fullTargetPath = join(this.resourcesBaseDir, normalizedTarget);

      if (!existsSync(fullSourcePath)) {
        return {
          success: false,
          sourcePath: normalizedSource,
          targetPath: normalizedTarget,
          error: `Source asset not found: ${normalizedSource}`,
        };
      }

      if (existsSync(fullTargetPath)) {
        return {
          success: false,
          sourcePath: normalizedSource,
          targetPath: normalizedTarget,
          error: `Target asset already exists: ${normalizedTarget}`,
        };
      }

      const content = await readFile(fullSourcePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.metadata) {
        data.metadata.createdAt = new Date().toISOString();
      }
      if (data.system && typeof data.system === 'object') {
        const basename = targetPath.split('/').pop() || targetPath.split('\\').pop() || 'duplicate';
        const filename = basename.replace(/\.(asset|json)$/i, '') || 'duplicate';
        (data.system as { displayName?: string }).displayName = filename;
      }

      const targetDir = dirname(fullTargetPath);
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      await writeFile(fullTargetPath, JSON.stringify(data, null, 2), 'utf-8');

      const guid = await this.ensureMetaFile(normalizedTarget);
      if (guid) {
        const registerDeferred = new OperationDeferred<boolean>();
        await EventBus.instance.publishAsync(new RegisterGuidEvent(guid, registerDeferred));
        await registerDeferred.promise;

        await EventBus.instance.publishAsync(new MarkAssetDirtyEvent(guid));
      }

      return {
        success: true,
        sourcePath: normalizedSource,
        targetPath: normalizedTarget,
      };
    } catch (error) {
      logError('Duplicate asset failed:', error);
      return {
        success: false,
        sourcePath,
        targetPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async renameAsset(
    oldPath: string,
    newPath: string
  ): Promise<{ success: boolean; oldPath: string; newPath: string; error?: string }> {
    try {
      const normalizedOld = oldPath.replace(/^\/+/, '');
      const normalizedNew = newPath.replace(/^\/+/, '');

      const fullOldPath = join(this.resourcesBaseDir, normalizedOld);
      const fullNewPath = join(this.resourcesBaseDir, normalizedNew);

      if (!existsSync(fullOldPath)) {
        return {
          success: false,
          oldPath: normalizedOld,
          newPath: normalizedNew,
          error: `Asset not found: ${normalizedOld}`,
        };
      }

      if (existsSync(fullNewPath)) {
        return {
          success: false,
          oldPath: normalizedOld,
          newPath: normalizedNew,
          error: `Target path already exists: ${normalizedNew}`,
        };
      }

      const newDir = dirname(fullNewPath);
      if (!existsSync(newDir)) {
        await mkdir(newDir, { recursive: true });
      }

      await renameFile(fullOldPath, fullNewPath);

      const oldMetaPath = `${fullOldPath}.meta`;
      const newMetaPath = `${fullNewPath}.meta`;
      if (existsSync(oldMetaPath)) {
        try {
          await renameFile(oldMetaPath, newMetaPath);
        } catch (error) {
          logWarn(`Failed to rename .meta file for ${normalizedOld}:`, error);
        }
      }

      try {
        const content = await readFile(fullNewPath, 'utf-8');
        const data = JSON.parse(content);

        const basename = newPath.split('/').pop() || newPath.split('\\').pop() || '';
        const currentDisplayName = (data.system as { displayName?: string })?.displayName;
        const newFilename = basename.replace(/\.(asset|json)$/i, '') || currentDisplayName || '';
        if (
          data.system &&
          typeof data.system === 'object' &&
          currentDisplayName &&
          newFilename !== currentDisplayName
        ) {
          (data.system as { displayName?: string }).displayName = newFilename;
          await writeFile(fullNewPath, JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch (error) {
        logWarn('Failed to update asset ID after rename:', error);
      }

      return {
        success: true,
        oldPath: normalizedOld,
        newPath: normalizedNew,
      };
    } catch (error) {
      logError('Rename asset failed:', error);
      return {
        success: false,
        oldPath,
        newPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async saveAsset(
    relativePath: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      const normalizedPath = relativePath.replace(/^\/+/, '');
      const fullPath = join(this.resourcesBaseDir, normalizedPath);

      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      const assetContent = JSON.stringify(data, null, 2);
      await writeFile(fullPath, assetContent, 'utf-8');

      const checksum = createHash('sha256').update(assetContent, 'utf8').digest('hex');
      const fileSize = assetContent.length;

      try {
        const metaPath = `${this.toResourcesPath(normalizedPath)}.meta`;
        const metaContent = await readFile(join(this.resourcesBaseDir, metaPath), 'utf-8');
        const fileMeta = JSON.parse(metaContent) as MetaData;

        if (!fileMeta.guid) {
          return { success: false, path: normalizedPath, error: 'Meta file missing GUID' };
        }

        const readDeferred = new OperationDeferred<MetaData>();
        await EventBus.instance.publishAsync(new ReadMetaFileEvent(fileMeta.guid, readDeferred));
        const readResult = await readDeferred.promise;
        if (!readResult.isSuccess || !readResult.value) {
          throw new Error(readResult.errorMessage || 'Failed to read meta file');
        }
        const loadedMeta = readResult.value;
        const updateDeferred = new OperationDeferred<void>();
        await EventBus.instance.publishAsync(
          new UpdateMetaOnSaveEvent(loadedMeta.guid, updateDeferred, checksum, fileSize)
        );
        await updateDeferred.promise;
      } catch (error) {
        logWarn(`Failed to update .meta file for ${normalizedPath}:`, error);
      }

      return {
        success: true,
        path: normalizedPath,
      };
    } catch (error) {
      logError('Save asset failed:', error);
      return {
        success: false,
        path: relativePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async updateAsset(
    relativePath: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; path: string; error?: string }> {
    try {
      const normalizedPath = relativePath.replace(/^\/+/, '');
      const fullPath = join(this.resourcesBaseDir, normalizedPath);

      if (!existsSync(fullPath)) {
        return {
          success: false,
          path: normalizedPath,
          error: `Asset not found: ${normalizedPath}`,
        };
      }

      const existingContent = await readFile(fullPath, 'utf-8');
      const existingData = JSON.parse(existingContent);
      const mergedData = { ...existingData, ...data };

      return await this.saveAsset(relativePath, mergedData);
    } catch (error) {
      logError('Update asset failed:', error);
      return {
        success: false,
        path: relativePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
