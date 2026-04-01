import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { MainAppPathResolver } from '@ocentra/logging-domain/core/adapters/mainAppPathResolver';

const pathResolver = new MainAppPathResolver({
  getFilePathFromUrl: (url: string) => url,
  getSourceFromFilePath: () => 'AssetEditor:app',
});

let initialized = false;

export function initAssetEditorLogging(): void {
  if (initialized) return;
  initialized = true;

  AssetEditorLogger.initLogger(null, pathResolver, { consoleEnabled: true });
}
