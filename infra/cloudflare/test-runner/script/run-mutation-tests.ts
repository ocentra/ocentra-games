import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { collectMutations, type MutationPlan } from './lib/mutation-collector.js';

type StrykerConfig = Record<string, unknown> & { mutate?: string[] };

const toPosixPath = (p: string): string => p.replace(/\\/g, '/');

const fileExists = (p: string): boolean => {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const readTextFile = (p: string): string => fs.readFileSync(p, 'utf8');

const toMutationRange = (
  relPath: string,
  target: {
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
  }
): string => {
  if (
    typeof target.startLine === 'number' &&
    typeof target.startColumn === 'number' &&
    typeof target.endLine === 'number' &&
    typeof target.endColumn === 'number'
  ) {
    return `${relPath}:${target.startLine}:${target.startColumn}-${target.endLine}:${target.endColumn}`;
  }
  return relPath;
};

const collectMutationTargetPatterns = (rootDir: string): string[] => {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  if (!fileExists(tsconfigPath)) {
    return [];
  }

  try {
    const plan = collectMutations(tsconfigPath, 'src');
    
    if (plan.targets.length === 0) {
      return [];
    }

    const uniquePatterns = new Set<string>();
    for (const target of plan.targets) {
      const absPath = path.resolve(rootDir, target.file);
      const relPath = toPosixPath(path.relative(rootDir, absPath));
      uniquePatterns.add(toMutationRange(relPath, target));
    }

    return Array.from(uniquePatterns).sort();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[mutation] Failed to collect mutation targets: ${errorMessage}`);
    return [];
  }
};

const readBaseStrykerConfig = (rootDir: string): StrykerConfig => {
  const configPath = path.join(rootDir, 'stryker.conf.json');
  const raw = readTextFile(configPath);
  return JSON.parse(raw) as StrykerConfig;
};

const writeTempStrykerConfig = (rootDir: string, config: StrykerConfig): string => {
  const outDir = path.join(rootDir, 'test-runner', 'stryker-tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'stryker.conf.decorator.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2), 'utf8');
  return outPath;
};

const runStryker = (rootDir: string, configFile: string): number => {
  const result = spawnSync(
    'npx',
    ['--yes', 'stryker', 'run', configFile],
    { cwd: rootDir, stdio: 'inherit', shell: true }
  );

  if (result.error) {
    console.error(`[mutation] Failed to start Stryker: ${result.error.message}`);
    return 1;
  }

  return typeof result.status === 'number' ? result.status : 1;
};

function main(): void {
  const rootDir = process.cwd();
  
  const mutationPlanPath = path.join(rootDir, 'test-runner', 'ReportJson', 'mutation-plan.json');
  let mutationTargets: string[] = [];

  if (fileExists(mutationPlanPath)) {
    try {
      const plan: MutationPlan = JSON.parse(readTextFile(mutationPlanPath));
      const uniquePatterns = new Set<string>();
      for (const target of plan.targets) {
        const absPath = path.resolve(rootDir, target.file);
        const relPath = toPosixPath(path.relative(rootDir, absPath));
        uniquePatterns.add(toMutationRange(relPath, target));
      }
      mutationTargets = Array.from(uniquePatterns).sort();
      process.stdout.write(`[mutation] Using mutation plan with ${plan.targets.length} target(s)\n`);
    } catch {
      process.stdout.write('[mutation] Failed to read mutation-plan.json, falling back to collector\n');
      mutationTargets = collectMutationTargetPatterns(rootDir);
    }
  } else {
    mutationTargets = collectMutationTargetPatterns(rootDir);
  }

  if (mutationTargets.length === 0) {
    process.stdout.write('[mutation] No @mutation targets found in src/. Skipping Stryker.\n');
    process.exit(0);
  }

  process.stdout.write('[mutation] Stryker will run tests and check baseline automatically.\n');
  process.stdout.write('[mutation] With coverageAnalysis: perTest, only tests covering mutated files will run.\n');

  const baseConfig = readBaseStrykerConfig(rootDir);
  const effectiveConfig: StrykerConfig = {
    ...baseConfig,
    mutate: mutationTargets,
  };

  const tempConfigPath = writeTempStrykerConfig(rootDir, effectiveConfig);
  process.stdout.write(`[mutation] Running Stryker on ${mutationTargets.length} JSDoc-selected file(s)\n`);
  const exitCode = runStryker(rootDir, tempConfigPath);
  process.exit(exitCode);
}

main();

