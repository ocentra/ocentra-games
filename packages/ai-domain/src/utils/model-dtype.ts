import { extractDtypeFromPath } from '@/utils/dtype';
import { CHUNK_SIZE } from '@/constants/model-storage';

export const extractCleanDtype = extractDtypeFromPath;

export function shouldChunkFile(fileSize: number, chunkSize: number = CHUNK_SIZE): boolean {
  return fileSize > chunkSize;
}
