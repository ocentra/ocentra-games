import type { PathResolver } from '@/core/pathResolver';
import type { LogSource } from '@/types/logSource';

export interface MainAppPathFunctions {
  getFilePathFromUrl: (url: string) => string;
  getSourceFromFilePath: (filePath?: string) => LogSource;
}

export class MainAppPathResolver implements PathResolver {
  constructor(private pathFunctions: MainAppPathFunctions) {}

  getFilePathFromUrl(url: string): string {
    return this.pathFunctions.getFilePathFromUrl(url);
  }

  getSourceFromFilePath(filePath?: string): LogSource {
    return this.pathFunctions.getSourceFromFilePath(filePath);
  }
}
