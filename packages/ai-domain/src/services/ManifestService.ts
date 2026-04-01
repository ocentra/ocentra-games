import {
  getManifestEntry,
  fetchRepoFiles,
  addManifestEntry,
} from '@/storage/model-storage-api';
import type { ManifestEntry, QuantInfo } from '@/types/model-storage';
import { CURRENT_MANIFEST_VERSION } from '@/constants/model-storage';
import { getServerOnlySizeLimit, getBypassSizeLimitModels } from '@/storage/model-loading-settings';
import { getRuntimeConstraintsAdapter } from '@/types/runtime-constraints-adapter';
import { QUANT_STATUS } from '@/constants/quant-status';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_MANIFEST_GENERATION = false;
const LOG_AI = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_MANIFEST_GENERATION) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const SUPPORTING_FILE_REGEX = /\.(onnx(\.data)?|onnx_data|json|bin|pt|txt|model)$/i;

function extractCleanDtypeFromPath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') return 'fp32';
  const filename = filePath.split('/').pop() || filePath;
  const nameWithoutExt = filename.replace(/\.onnx$/, '');
  if (nameWithoutExt.includes('q4f16')) return 'q4f16';
  if (nameWithoutExt.includes('uint8')) return 'uint8';
  if (nameWithoutExt.includes('int8')) return 'int8';
  if (nameWithoutExt.includes('bnb4')) return 'bnb4';
  if (nameWithoutExt.includes('q4')) return 'q4';
  if (nameWithoutExt.includes('q8')) return 'q8';
  if (nameWithoutExt.includes('fp16')) return 'fp16';
  if (nameWithoutExt.includes('fp32')) return 'fp32';
  if (nameWithoutExt.includes('quantized')) return 'quantized';
  return 'fp32';
}

export async function ensureManifestForRepos(
  repos: string[],
  forceRebuild: boolean = false
): Promise<void> {
  if (LOG_MANIFEST_GENERATION) {
    logInfo('[ensureManifestForRepos] Repos to check/update:', repos, LOG_MANIFEST_GENERATION);
  }

  const processedRepos: string[] = [];
  const skippedRepos: string[] = [];
  const errorRepos: string[] = [];

  for (const repo of repos) {
    if (!forceRebuild) {
      const existingManifest = await getManifestEntry(repo);
      if (existingManifest) {
        if (LOG_MANIFEST_GENERATION) {
          logInfo(
            `[ensureManifestForRepos] Manifest for ${repo} already exists. Skipping fetch/build.`,
            undefined,
            LOG_MANIFEST_GENERATION
          );
        }
        processedRepos.push(repo);
        continue;
      }
    } else {
      if (LOG_MANIFEST_GENERATION) {
        logInfo(
          `[ensureManifestForRepos] Force rebuild requested for ${repo}. Will update/create manifest.`,
          undefined,
          LOG_MANIFEST_GENERATION
        );
      }
    }

    let oldManifest: ManifestEntry | null = null;
    try {
      oldManifest = await getManifestEntry(repo);
      if (oldManifest && oldManifest.manifestVersion !== CURRENT_MANIFEST_VERSION) {
        if (LOG_MANIFEST_GENERATION) {
          logWarn(`[ensureManifestForRepos] Manifest version mismatch for ${repo}: found ${oldManifest.manifestVersion}, expected ${CURRENT_MANIFEST_VERSION}. Will re-create.`, undefined, LOG_AI);
        }
        oldManifest = null;
      }
    } catch (e) {
      if (LOG_MANIFEST_GENERATION) {
        logWarn(`[ensureManifestForRepos] Error fetching existing manifest for ${repo}, will create anew if possible.`, e, LOG_AI);
      }
    }

    try {
      const { siblings, task } = await fetchRepoFiles(repo);
      if (!siblings || siblings.length === 0) {
        if (LOG_MANIFEST_GENERATION) {
          logWarn(`[ensureManifestForRepos] No files (siblings) found for repo: ${repo}. Skipping manifest update for this repo.`, undefined, LOG_AI);
        }
        skippedRepos.push(repo);
        continue;
      }

      const allFileNamesInRepo = new Set(siblings.map((f) => f.rfilename));
      if (LOG_MANIFEST_GENERATION) {
        logInfo(`[ensureManifestForRepos] All files in repo ${repo}:`, Array.from(allFileNamesInRepo), LOG_MANIFEST_GENERATION);
      }

      const quantMap: Record<string, QuantInfo> = {};

      for (const file of siblings) {
        if (file.rfilename && file.rfilename.endsWith('.onnx')) {
          const quantKey = file.rfilename;
          if (!allFileNamesInRepo.has(quantKey)) {
            if (LOG_MANIFEST_GENERATION) {
              logWarn(`[ensureManifestForRepos] Quant model file missing for quantKey: ${quantKey} in repo ${repo}. Skipping this quant.`, undefined, LOG_AI);
            }
            continue;
          }
          if (LOG_MANIFEST_GENERATION) {
            logInfo(
              `[ensureManifestForRepos] Found quant file (quantKey): ${quantKey} in repo ${repo}`,
              undefined,
              LOG_MANIFEST_GENERATION
            );
          }

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

          let isServerOnly = false;
          let serverOnlySizeLimit = await getServerOnlySizeLimit();
          const constraints = getRuntimeConstraintsAdapter();
          if (constraints?.maxModelSizeBytes != null && constraints.maxModelSizeBytes > 0) {
            serverOnlySizeLimit = Math.min(serverOnlySizeLimit, constraints.maxModelSizeBytes);
          }
          const bypassModels = await getBypassSizeLimitModels();

          if (LOG_MANIFEST_GENERATION) {
            logInfo(`[ensureManifestForRepos] Processing ${quantKey} for ${repo}:`, undefined, LOG_MANIFEST_GENERATION);
            logInfo(
              `[ensureManifestForRepos] Size limit: ${serverOnlySizeLimit / (1024 * 1024 * 1024)} GB`,
              undefined,
              LOG_MANIFEST_GENERATION
            );
            logInfo(`[ensureManifestForRepos] Bypass models:`, Array.from(bypassModels), LOG_MANIFEST_GENERATION);
            logInfo(
              `[ensureManifestForRepos] Required files for ${quantKey}:`,
              Array.from(currentQuantRequiredFiles),
              LOG_MANIFEST_GENERATION
            );
          }

          if (quantKey.endsWith('.onnx')) {
            const baseName = quantKey.replace(/\.onnx$/, '');
            const dataFile = siblings.find(
              (f) =>
                f.rfilename === `${baseName}.onnx_data` || f.rfilename === `${baseName}.onnx.data`
            );
            if (dataFile && typeof dataFile.size === 'number') {
              const dataFileSizeGB = dataFile.size / (1024 * 1024 * 1024);
              const limitGB = serverOnlySizeLimit / (1024 * 1024 * 1024);
              const isOverLimit = dataFile.size > serverOnlySizeLimit;

              if (LOG_MANIFEST_GENERATION) {
                logInfo(`[ensureManifestForRepos] ${quantKey} size check:`, undefined, LOG_MANIFEST_GENERATION);
                logInfo(`[ensureManifestForRepos] - Data file: ${dataFile.rfilename}`, undefined, LOG_MANIFEST_GENERATION);
                logInfo(
                  `[ensureManifestForRepos] - Data file size: ${dataFile.size} bytes (${dataFileSizeGB.toFixed(2)} GB)`,
                  undefined,
                  LOG_MANIFEST_GENERATION
                );
                logInfo(
                  `[ensureManifestForRepos] - Size limit: ${serverOnlySizeLimit} bytes (${limitGB.toFixed(2)} GB)`,
                  undefined,
                  LOG_MANIFEST_GENERATION
                );
                logInfo(`[ensureManifestForRepos] - Is over limit: ${isOverLimit}`, undefined, LOG_MANIFEST_GENERATION);
                logInfo(`[ensureManifestForRepos] - Is in bypass: ${bypassModels.has(repo)}`, undefined, LOG_MANIFEST_GENERATION);
              }

              if (isOverLimit) {
                if (!bypassModels.has(repo)) {
                  isServerOnly = true;
                  if (LOG_MANIFEST_GENERATION) {
                    logInfo(
                      `[ensureManifestForRepos] - Setting server_only=true (over limit and not bypassed)`,
                      undefined,
                      LOG_MANIFEST_GENERATION
                    );
                  }
                } else {
                  if (LOG_MANIFEST_GENERATION) {
                    logInfo(
                      `[ensureManifestForRepos] - NOT setting server_only (over limit but bypassed)`,
                      undefined,
                      LOG_MANIFEST_GENERATION
                    );
                  }
                }
              } else {
                if (LOG_MANIFEST_GENERATION) {
                  logInfo(
                    `[ensureManifestForRepos] - NOT setting server_only (under limit)`,
                    undefined,
                    LOG_MANIFEST_GENERATION
                  );
                }
              }
            }
          }

          const oldStatus = oldManifest?.quants?.[quantKey]?.status;
          const status = isServerOnly ? QUANT_STATUS.SERVER_ONLY : QUANT_STATUS.AVAILABLE;

          if (LOG_MANIFEST_GENERATION) {
            logInfo(`[ensureManifestForRepos] Status calculation for ${quantKey}:`, undefined, LOG_MANIFEST_GENERATION);
            logInfo(`[ensureManifestForRepos] - isServerOnly: ${isServerOnly}`, undefined, LOG_MANIFEST_GENERATION);
            logInfo(`[ensureManifestForRepos] - oldStatus: ${oldStatus}`, undefined, LOG_MANIFEST_GENERATION);
            logInfo(`[ensureManifestForRepos] - final status: ${status}`, undefined, LOG_MANIFEST_GENERATION);
          }

          const fileSizes: Record<string, number> = {};
          for (const fname of currentQuantRequiredFiles) {
            let size: number | undefined = undefined;
            const entry = siblings.find((f) => f.rfilename === fname);
            if (entry && typeof entry.size === 'number' && entry.size > 0) {
              size = entry.size;
            }
            if (typeof size === 'number' && size > 0) {
              fileSizes[fname] = size;
            }
          }

          const baseName = quantKey.replace(/\.onnx$/, '');
          const hasExternalData =
            allFileNamesInRepo.has(`${baseName}.onnx_data`) ||
            allFileNamesInRepo.has(`${baseName}.onnx.data`);
          if (LOG_MANIFEST_GENERATION) {
            logInfo(
              `[ensureManifestForRepos] ${quantKey} hasExternalData: ${hasExternalData}`,
              undefined,
              LOG_MANIFEST_GENERATION
            );
          }

          quantMap[quantKey] = {
            files: Array.from(currentQuantRequiredFiles).sort(),
            status,
            dtype: extractCleanDtypeFromPath(quantKey),
            hasExternalData,
          };
          if (LOG_MANIFEST_GENERATION) {
            logInfo(
              `[ensureManifestForRepos] For quantKey ${quantKey}, required files: ${Array.from(currentQuantRequiredFiles).sort().join(', ')}, Status: ${status}`,
              { fileSizes },
              LOG_MANIFEST_GENERATION
            );
          }
        }
      }

      if (Object.keys(quantMap).length === 0) {
        if (LOG_MANIFEST_GENERATION) {
          logWarn(`[ensureManifestForRepos] No .onnx models found for repo ${repo}. Skipping manifest creation/update for this repo.`, undefined, LOG_AI);
        }
        skippedRepos.push(repo);
        continue;
      }

      const newManifestEntry: ManifestEntry = {
        repo,
        quants: quantMap,
        task,
        manifestVersion: CURRENT_MANIFEST_VERSION,
      };
      await addManifestEntry(repo, newManifestEntry);
      processedRepos.push(repo);
      if (LOG_MANIFEST_GENERATION) {
        logInfo(
          `[ensureManifestForRepos] Successfully created/updated manifest for repo: ${repo}`,
          newManifestEntry,
          LOG_MANIFEST_GENERATION
        );
      }
    } catch (e) {
      logError(`[ensureManifestForRepos] Failed to fetch repo files or process manifest for repo: ${repo}`, e, LOG_AI);
      errorRepos.push(repo);
    }
  }

  if (LOG_MANIFEST_GENERATION) {
    logInfo(`[ensureManifestForRepos] Finished processing all repos.`, undefined, LOG_MANIFEST_GENERATION);
    logInfo(`[ensureManifestForRepos] Processed repos:`, processedRepos, LOG_MANIFEST_GENERATION);
    if (skippedRepos.length > 0) {
      logWarn(
        `[ensureManifestForRepos] Skipped repos (no models or missing files):`,
        skippedRepos,
        LOG_AI
      );
    }
    if (errorRepos.length > 0) {
      logError(`[ensureManifestForRepos] Repos with errors:`, errorRepos, LOG_AI);
    }
  }
}
