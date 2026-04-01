export interface PathResolver {
  getFilePathFromUrl(url: string): string;
  getSourceFromFilePath(filePath?: string): string;
}

export function getSourceFromFilePath(pathResolver: PathResolver, filePath: string | undefined): string {
  return pathResolver.getSourceFromFilePath(filePath);
}
