export interface PathResolver {
  getModelsBasePath(): string;
}

function throwNodeOnly(): never {
  throw new Error(
    'Node file system backend is not available in browser. Use setPathResolver before bootstrapDesktop in Electron/Node.'
  );
}

export function setPathResolver(_resolver: PathResolver): void {
  throwNodeOnly();
}

export function getPathResolver(): PathResolver {
  throwNodeOnly();
}

export function getDefaultModelsPath(): string {
  throwNodeOnly();
}

export function createNodeFileSystemBackend(): never {
  throwNodeOnly();
}
