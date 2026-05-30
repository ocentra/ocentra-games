import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  PROCESSED_GAME_CATEGORY_ROOT,
  parseProcessedGameTaxonomyPath,
} from '@ocentra/game-asset-domain/factories/ProcessedGameAssetFactory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const sourceRoot = path.resolve(repoRoot, 'packages/card-games/src/processed-games');
const targetRoot = path.resolve(repoRoot, 'packages/asset-editor/Resources/GameMode/CardGames/Games');
const scaffoldMarkerFileName = '.gitkeep';

interface TaxonomyIssue {
  code: string;
  path: string;
  message: string;
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function collectDirectories(root: string, dir = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const relativePath = toPosixPath(path.relative(root, fullPath));
    out.push(relativePath);
    collectDirectories(root, fullPath, out);
  }
  return out.sort((left, right) => left.localeCompare(right));
}

function collectFiles(root: string, dir = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(root, fullPath, out);
      continue;
    }
    out.push(toPosixPath(path.relative(root, fullPath)));
  }
  return out.sort((left, right) => left.localeCompare(right));
}

function validateScaffold(): { issues: TaxonomyIssue[]; sourceDirectories: string[]; markerFiles: string[] } {
  const issues: TaxonomyIssue[] = [];
  const sourceDirectories = collectDirectories(sourceRoot);

  for (const relativePath of sourceDirectories) {
    const targetPath = path.join(targetRoot, relativePath);
    try {
      parseProcessedGameTaxonomyPath(`${PROCESSED_GAME_CATEGORY_ROOT}/${relativePath}`);
    } catch (error) {
      issues.push({
        code: 'invalid-source-taxonomy-path',
        path: relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
      issues.push({
        code: 'missing-target-taxonomy-folder',
        path: relativePath,
        message: `Missing Resources/GameMode/CardGames/Games/${relativePath}`,
      });
    }
  }

  const markerFiles = fs.existsSync(targetRoot)
    ? collectFiles(targetRoot).filter((relativePath) => path.basename(relativePath) === scaffoldMarkerFileName)
    : [];

  return { issues, sourceDirectories, markerFiles };
}

function main(): void {
  const result = validateScaffold();
  const summary = {
    sourceRoot,
    targetRoot,
    sourceDirectories: result.sourceDirectories.length,
    markerFiles: result.markerFiles.length,
    issueCount: result.issues.length,
    issues: result.issues,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (result.issues.length > 0) {
    process.exit(1);
  }
}

main();
