import type { PathResolver } from '@ocentra/logging-domain/core/pathResolver';
import type { LogSource } from '@ocentra/logging-domain/types/logSource';
import { LogSourcePrefix } from '@ocentra/logging-domain/types/logSource';

export interface CloudflarePathFunctions {
  getFilePathFromUrl: (url: string) => string;
}

export class CloudflarePathResolver implements PathResolver {
  constructor(private pathFunctions: CloudflarePathFunctions) {}

  getFilePathFromUrl(url: string): string {
    return this.pathFunctions.getFilePathFromUrl(url);
  }

  getSourceFromFilePath(_filePath?: string): LogSource {
    return `${LogSourcePrefix.Cloudflare}Unknown`;
  }
}
