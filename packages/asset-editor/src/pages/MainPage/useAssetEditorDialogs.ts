import { useState, useCallback } from 'react';
import type { CreateDialogOptions } from './types';
import type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
import type { CreateDialogMode } from '@ocentra/asset-domain/constants/assets';

function normalizeCreateDialogPath(rawPath?: string): string {
  if (!rawPath) {
    return '';
  }

  const normalized = rawPath
    .replace(/^\/+/, '')
    .replace(/^folder:/, '')
    .replace(/^Resources\//, '');

  if (normalized === '' || normalized === 'root') {
    return 'Resources';
  }

  return normalized.startsWith('Resources/') ? normalized : `Resources/${normalized}`;
}

export function useAssetEditorDialogs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogPath, setCreateDialogPath] = useState<string | undefined>(undefined);
  const [createDialogCategory, setCreateDialogCategory] = useState<AssetCategory | undefined>(undefined);
  const [createDialogAssetType, setCreateDialogAssetType] = useState<string | undefined>(undefined);
  const [createDialogMode, setCreateDialogMode] = useState<CreateDialogMode | undefined>(undefined);
  const [createDialogGameIdFromContext, setCreateDialogGameIdFromContext] = useState<string | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const handleCreateAsset = useCallback((
    folderOrOptions?: string | CreateDialogOptions,
    maybeOptions?: CreateDialogOptions
  ) => {
    let folderPath: string | undefined;
    let options: CreateDialogOptions | undefined;

    if (typeof folderOrOptions === 'string' || folderOrOptions === undefined) {
      folderPath = folderOrOptions;
      options = maybeOptions;
    } else {
      options = folderOrOptions;
    }

    const normalizedPath = normalizeCreateDialogPath(folderPath ?? options?.defaultPath);

    setCreateDialogPath(normalizedPath);
    setCreateDialogCategory(options?.category);
    setCreateDialogAssetType(options?.assetType);
    setCreateDialogMode(options?.mode);
    setCreateDialogGameIdFromContext(options?.gameIdFromContext);
    setIsCreateDialogOpen(true);
  }, []);

  const handleDeleteAsset = useCallback((path: string) => {
    setAssetToDelete(path);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    setCreateDialogPath(undefined);
    setCreateDialogCategory(undefined);
    setCreateDialogAssetType(undefined);
    setCreateDialogMode(undefined);
    setCreateDialogGameIdFromContext(undefined);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setAssetToDelete(null);
  }, []);

  return {
    isCreateDialogOpen,
    createDialogPath,
    createDialogCategory,
    createDialogAssetType,
    createDialogMode,
    createDialogGameIdFromContext,
    isDeleteDialogOpen,
    assetToDelete,
    handleCreateAsset,
    handleDeleteAsset,
    closeCreateDialog,
    closeDeleteDialog,
  };
}
