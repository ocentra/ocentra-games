import fs from 'fs';
import path from 'path';
import {
  PROCESSED_GAME_CATEGORY_ROOT,
  parseProcessedGameTaxonomyPath,
  type ProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';
import {
  assertKnownTaxonomyCategory,
  defaultProcessedGamesRoot,
  installProcessedGameBundle,
  processedGameSlug,
  repoRoot,
  resourcesRoot,
  resolveTargetMainAssetPath,
  setupProcessedGameBundleEventBus,
  toPosixPath,
} from './processed-game-bundle-installer';

const defaultReportPath = path.resolve(repoRoot, '.temp/processed-game-batch-report.json');

type BatchStatus = 'installed' | 'skipped' | 'failed';

interface CliOptions {
  processedRoot: string;
  prefix: ProcessedGameTaxonomyPath;
  sourcePrefix: string;
  limit?: number;
  skipExisting: boolean;
  dryRun: boolean;
  reportPath: string;
  maxFailures: number;
}

interface SourceReport {
  status: BatchStatus;
  sourceRelPath: string;
  targetCategoryPath: string;
  slug: string;
  mainAssetPath: string | null;
  filesToWrite: number;
  filesWritten: number;
  errorMessage: string | null;
}

interface BatchReport {
  summary: {
    generatedAt: string;
    processedRoot: string;
    resourcesRoot: string;
    prefix: string;
    sourcePrefix: string;
    selected: number;
    processed: number;
    installed: number;
    skipped: number;
    failed: number;
    dryRun: boolean;
    skipExisting: boolean;
    limit: number | null;
    maxFailures: number;
    stoppedEarly: boolean;
  };
  sources: SourceReport[];
}

function readArgValue(argv: string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equalsArg = argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) {
    return equalsArg.slice(equalsPrefix.length);
  }
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : undefined;
}

function readNumberArg(argv: string[], name: string): number | undefined {
  const value = readArgValue(argv, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function assertKnownOptions(argv: string[]): void {
  const knownOptions = new Set([
    '--prefix',
    '--root',
    '--limit',
    '--skip-existing',
    '--dry-run',
    '--report',
    '--max-failures',
  ]);
  const booleanOptions = new Set(['--skip-existing', '--dry-run']);

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue;
    }
    const optionName = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (!knownOptions.has(optionName)) {
      throw new Error(`Unknown option: ${optionName}`);
    }
    if (booleanOptions.has(optionName) && arg.includes('=')) {
      throw new Error(`${optionName} does not accept a value`);
    }
  }
}

function parsePrefix(value: string): { prefix: ProcessedGameTaxonomyPath; sourcePrefix: string } {
  const normalizedInput = toPosixPath(value)
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
  if (!normalizedInput) {
    throw new Error('--prefix must name a source taxonomy folder');
  }

  const lowerRoot = PROCESSED_GAME_CATEGORY_ROOT.toLowerCase();
  const candidate = normalizedInput.toLowerCase().startsWith(`${lowerRoot}/`)
    ? normalizedInput
    : `${PROCESSED_GAME_CATEGORY_ROOT}/${normalizedInput}`;
  const prefix = parseProcessedGameTaxonomyPath(candidate);
  const sourcePrefix = prefix.slice(`${PROCESSED_GAME_CATEGORY_ROOT}/`.length);
  return { prefix, sourcePrefix };
}

function assertDirectory(value: string, message: string): void {
  if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) {
    throw new Error(message);
  }
}

function validatePrefix(options: Pick<CliOptions, 'processedRoot' | 'prefix' | 'sourcePrefix'>): void {
  const sourceDirectory = path.resolve(options.processedRoot, options.sourcePrefix);
  const targetDirectory = path.resolve(resourcesRoot, 'GameMode', options.prefix);
  assertDirectory(sourceDirectory, `Processed game prefix is not a source taxonomy folder: ${options.sourcePrefix}`);
  assertDirectory(targetDirectory, `Processed game prefix is not scaffolded in Resources: ${options.prefix}`);
}

function parseArgs(argv: string[]): CliOptions {
  assertKnownOptions(argv);
  const prefixArg = readArgValue(argv, '--prefix');
  if (!prefixArg) {
    throw new Error('Usage: tsx scripts/migrate-processed-game-batch.ts --prefix=<category[/subcategory]> [--limit=N] [--skip-existing] [--dry-run] [--report=<path>] [--max-failures=N]');
  }

  const parsedPrefix = parsePrefix(prefixArg);
  const options = {
    processedRoot: path.resolve(readArgValue(argv, '--root') ?? defaultProcessedGamesRoot),
    prefix: parsedPrefix.prefix,
    sourcePrefix: parsedPrefix.sourcePrefix,
    limit: readNumberArg(argv, '--limit'),
    skipExisting: argv.includes('--skip-existing'),
    dryRun: argv.includes('--dry-run'),
    reportPath: path.resolve(readArgValue(argv, '--report') ?? defaultReportPath),
    maxFailures: readNumberArg(argv, '--max-failures') ?? Number.MAX_SAFE_INTEGER,
  };
  validatePrefix(options);
  return options;
}

function findJsonFiles(root: string, dir = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsonFiles(root, fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(fullPath);
    }
  }
  return out.sort((left, right) => toPosixPath(path.relative(root, left)).localeCompare(toPosixPath(path.relative(root, right))));
}

function selectFiles(options: CliOptions): string[] {
  const sourceDirectory = path.resolve(options.processedRoot, options.sourcePrefix);
  const files = findJsonFiles(options.processedRoot, sourceDirectory)
    .filter((file) => toPosixPath(path.relative(options.processedRoot, file)).startsWith(options.sourcePrefix));
  return typeof options.limit === 'number' ? files.slice(0, options.limit) : files;
}

function sourceRelPath(options: CliOptions, filePath: string): string {
  return toPosixPath(path.relative(options.processedRoot, filePath));
}

function createSkippedReport(options: CliOptions, filePath: string, targetCategoryPath: ProcessedGameTaxonomyPath): SourceReport {
  return {
    status: 'skipped',
    sourceRelPath: sourceRelPath(options, filePath),
    targetCategoryPath,
    slug: processedGameSlug(filePath),
    mainAssetPath: null,
    filesToWrite: 0,
    filesWritten: 0,
    errorMessage: null,
  };
}

function createFailedReport(options: CliOptions, filePath: string, targetCategoryPath: string, error: unknown): SourceReport {
  return {
    status: 'failed',
    sourceRelPath: sourceRelPath(options, filePath),
    targetCategoryPath,
    slug: processedGameSlug(filePath),
    mainAssetPath: null,
    filesToWrite: 0,
    filesWritten: 0,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

async function processOne(options: CliOptions, filePath: string): Promise<SourceReport> {
  let targetCategoryPath = '';
  try {
    const resolvedCategory = assertKnownTaxonomyCategory(filePath, undefined, options.processedRoot);
    targetCategoryPath = resolvedCategory;
    const slug = processedGameSlug(filePath);
    if (options.skipExisting && fs.existsSync(resolveTargetMainAssetPath(resolvedCategory, slug))) {
      return createSkippedReport(options, filePath, resolvedCategory);
    }

    const result = await installProcessedGameBundle({
      processedGamePath: filePath,
      processedRoot: options.processedRoot,
      category: resolvedCategory,
      dryRun: options.dryRun,
    });

    return {
      status: 'installed',
      sourceRelPath: sourceRelPath(options, filePath),
      targetCategoryPath: result.targetCategoryPath,
      slug: result.slug,
      mainAssetPath: result.mainAssetPath,
      filesToWrite: result.filesToWrite,
      filesWritten: result.filesWritten,
      errorMessage: null,
    };
  } catch (error) {
    return createFailedReport(options, filePath, targetCategoryPath || options.prefix, error);
  }
}

function buildReport(options: CliOptions, selected: number, sources: SourceReport[], stoppedEarly: boolean): BatchReport {
  const countStatus = (status: BatchStatus): number => sources.filter((source) => source.status === status).length;
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      processedRoot: options.processedRoot,
      resourcesRoot,
      prefix: options.prefix,
      sourcePrefix: options.sourcePrefix,
      selected,
      processed: sources.length,
      installed: countStatus('installed'),
      skipped: countStatus('skipped'),
      failed: countStatus('failed'),
      dryRun: options.dryRun,
      skipExisting: options.skipExisting,
      limit: options.limit ?? null,
      maxFailures: options.maxFailures,
      stoppedEarly,
    },
    sources,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  setupProcessedGameBundleEventBus();
  const files = selectFiles(options);
  const reports: SourceReport[] = [];
  let failureCount = 0;
  let stoppedEarly = false;

  for (const file of files) {
    const report = await processOne(options, file);
    reports.push(report);
    if (report.status === 'failed') {
      failureCount += 1;
      if (failureCount >= options.maxFailures) {
        stoppedEarly = reports.length < files.length;
        break;
      }
    }
  }

  const report = buildReport(options, files.length, reports, stoppedEarly);
  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
  process.stdout.write(`Wrote processed game batch report to ${options.reportPath}\n`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
