export interface FileSystemBackend {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
  exists(path: string): Promise<boolean>;
  unlink(path: string): Promise<void>;
}
