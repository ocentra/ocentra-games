import path from 'path';
import {
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import {
  installProcessedGameBundle,
  setupProcessedGameBundleEventBus,
} from './processed-game-bundle-installer';

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
  setupProcessedGameBundleEventBus();
  const options = parseArgs(process.argv.slice(2));
  const result = await installProcessedGameBundle({
    processedGamePath: options.processedGamePath,
    category: options.category,
  });

  process.stdout.write(
    JSON.stringify(
      {
        mainAssetGuid: result.mainAssetGuid,
        mainAssetPath: result.mainAssetPath,
        resourcesRoot: result.resourcesRoot,
        filesWritten: result.filesWritten,
        writtenFiles: result.writtenFiles,
      },
      null,
      2,
    ) + '\n',
  );
}

void main();
