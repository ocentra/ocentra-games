import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import JSON5 from 'json5';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createProcessedGameModeBundle } from '@/adapters/assets/createProcessedGameModeBundle';
import {
  deriveProcessedGameCategory,
  type ProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '../../..');
export const defaultProcessedGamesRoot = path.resolve(repoRoot, 'packages/card-games/src/processed-games');
export const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');

export interface InstallProcessedGameBundleOptions {
  processedGamePath: string;
  processedRoot?: string;
  category?: ProcessedGameTaxonomyPath;
  dryRun?: boolean;
}

export interface InstallProcessedGameBundleResult {
  mainAssetGuid: string;
  mainAssetPath: string;
  resourcesRoot: string;
  targetCategoryPath: ProcessedGameTaxonomyPath;
  slug: string;
  filesToWrite: number;
  filesWritten: number;
  outputFiles: string[];
  writtenFiles: string[];
}

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function processedGameSlug(processedGamePath: string): string {
  return path.basename(processedGamePath, path.extname(processedGamePath)).trim().toLowerCase();
}

export function setupProcessedGameBundleEventBus(): void {
  EventBus.instance = createTestEventBus();
  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });
}

export function assertKnownTaxonomyCategory(
  processedGamePath: string,
  category?: ProcessedGameTaxonomyPath,
  processedRoot = defaultProcessedGamesRoot,
): ProcessedGameTaxonomyPath {
  const resolvedCategory = category ?? deriveProcessedGameCategory(processedGamePath, processedRoot);
  const categoryDir = path.resolve(resourcesRoot, 'GameMode', resolvedCategory);
  if (!fs.existsSync(categoryDir) || !fs.statSync(categoryDir).isDirectory()) {
    throw new Error(`Processed game category is not scaffolded: ${resolvedCategory}`);
  }
  return resolvedCategory;
}

export function resolveTargetGameDirectory(category: ProcessedGameTaxonomyPath, slug: string): string {
  return path.resolve(resourcesRoot, 'GameMode', category, slug);
}

export function resolveTargetMainAssetPath(category: ProcessedGameTaxonomyPath, slug: string): string {
  return path.resolve(resolveTargetGameDirectory(category, slug), `${slug}.asset`);
}

function resolveBundleOutputPath(bundlePath: string): string {
  return path.join(resourcesRoot, bundlePath.replace(/^Resources[\\/]/, ''));
}

function validateBundleFile(filePath: string, content: string): void {
  const parsed = JSON5.parse(content) as unknown;
  const validation = validateAssetFile(parsed);
  if (!validation.success) {
    throw new Error(
      `Validation failed for ${filePath}: ${validation.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(' | ')}`,
    );
  }
}

export async function installProcessedGameBundle(options: InstallProcessedGameBundleOptions): Promise<InstallProcessedGameBundleResult> {
  const processedGamePath = path.resolve(options.processedGamePath);
  const processedRoot = path.resolve(options.processedRoot ?? defaultProcessedGamesRoot);
  const targetCategoryPath = assertKnownTaxonomyCategory(processedGamePath, options.category, processedRoot);
  const bundle = await createProcessedGameModeBundle({
    processedGamePath,
    category: targetCategoryPath,
  });

  const outputFiles: string[] = [];
  const writtenFiles: string[] = [];

  for (const file of bundle.files) {
    validateBundleFile(file.path, file.content);
    const outputPath = resolveBundleOutputPath(file.path);
    outputFiles.push(outputPath);
    if (options.dryRun) {
      continue;
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, file.content, 'utf8');
    writtenFiles.push(outputPath);
  }

  return {
    mainAssetGuid: bundle.mainAssetGuid,
    mainAssetPath: bundle.mainAssetPath,
    resourcesRoot,
    targetCategoryPath,
    slug: processedGameSlug(processedGamePath),
    filesToWrite: outputFiles.length,
    filesWritten: writtenFiles.length,
    outputFiles,
    writtenFiles,
  };
}
