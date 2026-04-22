import type { PathResolver } from '@ocentra/logging-domain/core/pathResolver';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';

export interface MainAppPathFunctions {
  getFilePathFromUrl: (url: string) => string;
  getSourceFromFilePath: (filePath?: string) => LogSource;
}

export class MainAppPathResolver implements PathResolver {
  private pathFunctions: MainAppPathFunctions;

  constructor(pathFunctions: MainAppPathFunctions) {
    this.pathFunctions = pathFunctions;
  }


  getFilePathFromUrl(url: string): string {
    return this.pathFunctions.getFilePathFromUrl(url);
  }

  getSourceFromFilePath(filePath?: string): LogSource {
    return this.pathFunctions.getSourceFromFilePath(filePath);
  }
}
