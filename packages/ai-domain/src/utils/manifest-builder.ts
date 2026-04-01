import type { HuggingFaceSibling } from '@/types/huggingface';
import type { ModelManifestEntry, QuantInfo } from '@/types/huggingface';
import { SUPPORTING_FILE_REGEX } from '@/constants/huggingface';
import { QUANT_STATUS } from '@/constants/quant-status';
import { extractDtypeFromPath } from '@/utils/dtype';

const CURRENT_MANIFEST_VERSION = 1;

export function buildManifestFromSiblings(
  repo: string,
  siblings: HuggingFaceSibling[],
  task: string
): ModelManifestEntry {
  const allFileNamesInRepo = new Set(siblings.map((f) => f.rfilename));
  const quantMap: Record<string, QuantInfo> = {};

  for (const file of siblings) {
    if (!file.rfilename.endsWith('.onnx')) continue;
    const quantKey = file.rfilename;
    if (!allFileNamesInRepo.has(quantKey)) continue;

    const currentQuantRequiredFiles = new Set<string>();
    currentQuantRequiredFiles.add(quantKey);
    const quantDir = quantKey.includes('/') ? quantKey.substring(0, quantKey.lastIndexOf('/')) : '';

    for (const sibling of siblings) {
      if (sibling.rfilename === quantKey) continue;
      if (
        SUPPORTING_FILE_REGEX.test(sibling.rfilename) &&
        quantDir &&
        sibling.rfilename.startsWith(quantDir + '/')
      ) {
        currentQuantRequiredFiles.add(sibling.rfilename);
      }
    }
    for (const sibling of siblings) {
      if (sibling.rfilename === quantKey) continue;
      if (SUPPORTING_FILE_REGEX.test(sibling.rfilename) && !sibling.rfilename.includes('/')) {
        const fileName = sibling.rfilename;
        if (quantDir) {
          const subfolderVersion = `${quantDir}/${fileName}`;
          if (!currentQuantRequiredFiles.has(subfolderVersion)) {
            currentQuantRequiredFiles.add(fileName);
          }
        } else {
          currentQuantRequiredFiles.add(fileName);
        }
      }
    }

    const baseName = quantKey.replace(/\.onnx$/, '');
    const hasExternalData =
      allFileNamesInRepo.has(`${baseName}.onnx_data`) ||
      allFileNamesInRepo.has(`${baseName}.onnx.data`);

    const fileSizes: Record<string, number> = {};
    for (const fname of currentQuantRequiredFiles) {
      const entry = siblings.find((f) => f.rfilename === fname);
      if (entry && typeof entry.size === 'number' && entry.size > 0) {
        fileSizes[fname] = entry.size;
      }
    }

    quantMap[quantKey] = {
      files: Array.from(currentQuantRequiredFiles).sort(),
      status: QUANT_STATUS.AVAILABLE,
      dtype: extractDtypeFromPath(quantKey),
      hasExternalData,
      fileSizes: Object.keys(fileSizes).length > 0 ? fileSizes : undefined,
    };
  }

  return {
    repo,
    quants: quantMap,
    task,
    manifestVersion: CURRENT_MANIFEST_VERSION,
  };
}

export { CURRENT_MANIFEST_VERSION };
