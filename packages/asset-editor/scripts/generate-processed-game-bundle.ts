import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import {
  deriveProcessedGameCategory,
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import { createProcessedGameModeBundle } from '@/adapters/assets/createProcessedGameModeBundle';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');

interface CliOptions {
  processedGamePath: string;
  outputDir: string;
  category?: ProcessedGameTaxonomyPath;
}

function parseArgs(argv: string[]): CliOptions {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const processedGamePath = positional[0];
  if (!processedGamePath) {
    throw new Error('Usage: tsx scripts/generate-processed-game-bundle.ts <processed-game-json> [--out-dir <dir>] [--category <category>]');
  }

  const outDirIndex = argv.indexOf('--out-dir');
  const categoryIndex = argv.indexOf('--category');

  const outputDir = outDirIndex >= 0 && argv[outDirIndex + 1]
    ? path.resolve(argv[outDirIndex + 1])
    : path.resolve(repoRoot, '.cursor/tmp/generated-game-bundles', path.basename(processedGamePath, path.extname(processedGamePath)));

  const category = categoryIndex >= 0 && argv[categoryIndex + 1]
    ? parseProcessedGameTaxonomyPath(argv[categoryIndex + 1])
    : undefined;

  return {
    processedGamePath: path.resolve(processedGamePath),
    outputDir,
    category,
  };
}

function assertKnownTaxonomyCategory(processedGamePath: string, category?: ProcessedGameTaxonomyPath): ProcessedGameTaxonomyPath {
  const resolvedCategory = category ?? deriveProcessedGameCategory(processedGamePath);
  const categoryDir = path.resolve(resourcesRoot, 'GameMode', resolvedCategory);
  if (!fs.existsSync(categoryDir) || !fs.statSync(categoryDir).isDirectory()) {
    throw new Error(`Processed game category is not scaffolded: ${resolvedCategory}`);
  }
  return resolvedCategory;
}

async function main(): Promise<void> {
  EventBus.instance = createTestEventBus();
  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });

  const options = parseArgs(process.argv.slice(2));
  const category = assertKnownTaxonomyCategory(options.processedGamePath, options.category);
  const bundle = await createProcessedGameModeBundle({
    processedGamePath: options.processedGamePath,
    category,
  });

  fs.mkdirSync(options.outputDir, { recursive: true });

  for (const file of bundle.files) {
    const outputPath = path.join(options.outputDir, file.path.replace(/^Resources[\\/]/, ''));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, file.content, 'utf8');

    const parsed = JSON5.parse(file.content) as unknown;
    const validation = validateAssetFile(parsed);
    if (!validation.success) {
      throw new Error(`Validation failed for ${file.path}: ${validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' | ')}`);
    }
  }

  process.stdout.write(JSON.stringify({
    mainAssetGuid: bundle.mainAssetGuid,
    mainAssetPath: bundle.mainAssetPath,
    outputDir: options.outputDir,
    filesWritten: bundle.files.length,
  }, null, 2) + '\n');
}

void main();
