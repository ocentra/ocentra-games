import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import JSON5 from 'json5';

const MANIFEST_GUID = 'ae9defb2-5527-4aaf-95f2-fc02ef6b3413';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalAssets: number;
    totalMetaFiles: number;
    totalFolders: number;
    duplicateGuids: string[];
    orphanedMeta: string[];
    missingMeta: string[];
  };
}

interface MetaData {
  guid: string;
  type: string;
  assetType?: string;
  mimeType?: string;
  createdAt?: string;
  modifiedAt?: string;
  fileSize?: number;
  checksum?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(guid: string): boolean {
  return UUID_REGEX.test(guid);
}

async function scanDirectory(dir: string, relativePath: string = ''): Promise<{
  assets: string[];
  metaFiles: string[];
  folders: string[];
}> {
  const assets: string[] = [];
  const metaFiles: string[] = [];
  const folders: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        folders.push(relPath);
        const subResult = await scanDirectory(fullPath, relPath);
        assets.push(...subResult.assets);
        metaFiles.push(...subResult.metaFiles);
        folders.push(...subResult.folders);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.meta')) {
          metaFiles.push(relPath);
        } else if (entry.name.endsWith('.asset')) {
          assets.push(relPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error);
  }

  return { assets, metaFiles, folders };
}

async function readMetaFile(filePath: string): Promise<MetaData | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const meta = JSON5.parse(content) as MetaData;
    return meta;
  } catch {
    return null;
  }
}

async function validateMetaSystem(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    stats: {
      totalAssets: 0,
      totalMetaFiles: 0,
      totalFolders: 0,
      duplicateGuids: [],
      orphanedMeta: [],
      missingMeta: [],
    },
  };

  const resourcesDir = join(process.cwd(), 'packages', 'asset-editor', 'Resources');
  
  if (!existsSync(resourcesDir)) {
    result.passed = false;
    result.errors.push(`Resources directory not found: ${resourcesDir}`);
    return result;
  }

  console.log('Scanning Resources directory...');
  const { assets, metaFiles, folders } = await scanDirectory(resourcesDir);
  result.stats.totalAssets = assets.length;
  result.stats.totalMetaFiles = metaFiles.length;
  result.stats.totalFolders = folders.length;

  console.log(`Found ${assets.length} assets, ${metaFiles.length} .meta files, ${folders.length} folders`);

  const guidMap = new Map<string, string[]>();
  const assetToMeta = new Map<string, string>();

  for (const asset of assets) {
    const assetPath = join(resourcesDir, asset);
    const metaPath = `${assetPath}.meta`;
    const metaExists = existsSync(metaPath);

    if (!metaExists) {
      result.stats.missingMeta.push(asset);
      result.errors.push(`Missing .meta file for asset: ${asset}`);
      result.passed = false;
    } else {
      assetToMeta.set(asset, metaPath);
    }
  }

  for (const metaFile of metaFiles) {
    const metaPath = join(resourcesDir, metaFile);
    const assetPath = metaPath.replace(/\.meta$/, '');
    const assetExists = existsSync(assetPath);

    if (!assetExists && !metaFile.endsWith('folder.meta')) {
      result.stats.orphanedMeta.push(metaFile);
      result.warnings.push(`Orphaned .meta file (no corresponding asset): ${metaFile}`);
    }

    const meta = await readMetaFile(metaPath);
    if (!meta) {
      result.errors.push(`Failed to parse .meta file: ${metaFile}`);
      result.passed = false;
      continue;
    }

    if (!meta.guid) {
      result.errors.push(`Missing guid in .meta file: ${metaFile}`);
      result.passed = false;
      continue;
    }

    if (!isValidUUID(meta.guid)) {
      result.errors.push(`Invalid GUID format in .meta file: ${metaFile} (${meta.guid})`);
      result.passed = false;
      continue;
    }


    if (!guidMap.has(meta.guid)) {
      guidMap.set(meta.guid, []);
    }
    guidMap.get(meta.guid)!.push(metaFile);

    if (meta.createdAt) {
      const createdAt = new Date(meta.createdAt);
      if (isNaN(createdAt.getTime())) {
        result.errors.push(`Invalid createdAt date in .meta file: ${metaFile}`);
        result.passed = false;
      }
    }

      if (meta.modifiedAt) {
        const modifiedAt = new Date(meta.modifiedAt);
        if (isNaN(modifiedAt.getTime())) {
          result.errors.push(`Invalid modifiedAt date in .meta file: ${metaFile}`);
          result.passed = false;
        }

        if (meta.createdAt) {
          const createdAt = new Date(meta.createdAt);
          if (modifiedAt < createdAt) {
            result.warnings.push(`modifiedAt < createdAt in .meta file: ${metaFile} (this may be acceptable if file was created and never modified)`);
          }
        }
      }
  }

  for (const [guid, files] of guidMap.entries()) {
    if (files.length > 1) {
      result.stats.duplicateGuids.push(guid);
      result.errors.push(`Duplicate GUID ${guid} found in: ${files.join(', ')}`);
      result.passed = false;
    }
  }

  const manifestPath = join(resourcesDir, 'AssetRegistry.asset');
  const manifestMetaPath = join(resourcesDir, 'AssetRegistry.asset.meta');

  if (!existsSync(manifestPath)) {
    result.warnings.push('AssetRegistry.asset not found (may be auto-created on startup)');
  } else {
    if (!existsSync(manifestMetaPath)) {
      result.errors.push('AssetRegistry.asset.meta not found');
      result.passed = false;
    } else {
      const manifestMeta = await readMetaFile(manifestMetaPath);
      if (manifestMeta) {
        if (manifestMeta.guid !== MANIFEST_GUID) {
          result.warnings.push(`AssetRegistry.asset.meta has GUID ${manifestMeta.guid}, expected ${MANIFEST_GUID}`);
        }
      }
    }
  }

  for (const asset of assets) {
    const assetPath = join(resourcesDir, asset);
    const content = await readFile(assetPath, 'utf-8');
    
    if (content.includes('__guid:')) {
      result.errors.push(`Asset still contains __guid field: ${asset}`);
      result.passed = false;
    }
  }

  return result;
}

async function main() {
  console.log('=== Meta System Validation ===\n');
  
  const result = await validateMetaSystem();

  console.log('\n=== Validation Results ===');
  console.log(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`\nStatistics:`);
  console.log(`  Total Assets: ${result.stats.totalAssets}`);
  console.log(`  Total .meta Files: ${result.stats.totalMetaFiles}`);
  console.log(`  Total Folders: ${result.stats.totalFolders}`);
  console.log(`  Missing .meta: ${result.stats.missingMeta.length}`);
  console.log(`  Orphaned .meta: ${result.stats.orphanedMeta.length}`);
  console.log(`  Duplicate GUIDs: ${result.stats.duplicateGuids.length}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }

  if (result.passed) {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed. Please fix the errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});

