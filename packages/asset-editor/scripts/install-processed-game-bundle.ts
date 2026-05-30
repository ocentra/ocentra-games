import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { createTestEventBus } from '@ocentra/eventing-domain/testing/createTestEventBus';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createProcessedGameModeBundle } from '@/adapters/assets/createProcessedGameModeBundle';
import { parseProcessedGameTaxonomyPath, type ProcessedGameTaxonomyPath } from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const resourcesRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources');

interface CliOptions {
  processedGamePath: string;
  category?: ProcessedGameTaxonomyPath;
}

function parseArgs(argv: string[]): CliOptions {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const processedGamePath = positional[0];

  if (!processedGamePath) {
    throw new Error('Usage: tsx scripts/install-processed-game-bundle.ts <processed-game-json> [--category <category>]');
  }

  const categoryIndex = argv.indexOf('--category');
  const category = categoryIndex >= 0 && argv[categoryIndex + 1]
    ? parseProcessedGameTaxonomyPath(argv[categoryIndex + 1])
    : undefined;

  return {
    processedGamePath: path.resolve(processedGamePath),
    category,
  };
}

async function main(): Promise<void> {
  EventBus.instance = createTestEventBus();
  EventBus.instance.subscribeAsync(GenerateUniqueGuidEvent, async (event) => {
    event.deferred.resolve(OperationResult.success(crypto.randomUUID()));
  });

  const options = parseArgs(process.argv.slice(2));
  const bundle = await createProcessedGameModeBundle({
    processedGamePath: options.processedGamePath,
    category: options.category,
  });

  const writtenFiles: string[] = [];

  for (const file of bundle.files) {
    const parsed = JSON5.parse(file.content) as unknown;
    const validation = validateAssetFile(parsed);
    if (!validation.success) {
      throw new Error(
        `Validation failed for ${file.path}: ${validation.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(' | ')}`,
      );
    }

    const outputPath = path.join(resourcesRoot, file.path.replace(/^Resources[\\/]/, ''));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, file.content, 'utf8');
    writtenFiles.push(outputPath);
  }

  process.stdout.write(
    JSON.stringify(
      {
        mainAssetGuid: bundle.mainAssetGuid,
        mainAssetPath: bundle.mainAssetPath,
        resourcesRoot,
        filesWritten: writtenFiles.length,
        writtenFiles,
      },
      null,
      2,
    ) + '\n',
  );
}

void main();
