import type { PathResolver } from '@/core/pathResolver';
import type { LogSource } from '@/types/logSource';
import { LogSourcePrefix } from '@/types/logSource';

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
