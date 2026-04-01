import { createContext, useContext } from 'react';
import type { AssetData } from '@/types/assets';
import type { useSyncMenu } from '@/pages/MenuBar/SyncMenu/useSyncMenu';
import type { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetSelectInfo } from '@/pages/ResourceTree/types';
import type { CreateDialogOptions } from '@/pages/MainPage/types';

export interface EditorStateContextType {
  selectedAsset: string | null;
  assetPath: string | null;
  assetData: AssetData | null;
  assetRawContent: string | null;
  assetInstance: ScriptableObject | null;
  isLoadingAsset: boolean;
  assetError: string | null;
  navigationHistory: Array<{ path: string; name: string }>;
  refreshTreeTrigger: number;
  syncStatus: ReturnType<typeof useSyncMenu>['syncStatus'];
  onAssetSelect: (info: AssetSelectInfo | string) => void;
  onNavigateToAsset: (identifier: AssetIdentifier) => void;
  onBack: () => void;
  onContentChange: (content: string) => Promise<void>;
  onAssetUpdate: (data: AssetData) => void;
  onCreateAsset: (folderOrOptions?: string | CreateDialogOptions, maybeOptions?: CreateDialogOptions) => void;
  onDeleteAsset: (path: string) => void;
  onDeleteGameMode: (guid: string) => Promise<void>;
}

export const EditorStateContext = createContext<EditorStateContextType>(null!);
export const useEditorState = () => useContext(EditorStateContext);
