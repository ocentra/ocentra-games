#!/usr/bin/env node
/**
 * Upload Assets to R2
 * 
 * Uploads all assets from packages/asset-editor/Resources/ to Cloudflare R2
 * following the structure defined in ASSET-STRUCTURE.md
 * 
 * Usage:
 *   npm run upload-assets
 *   npm run upload-assets -- --dry-run  # Preview what would be uploaded
 *   npm run upload-assets -- --filter Cards  # Only upload Cards assets
 *   npm run upload-assets -- --ci  # CI mode (non-interactive, fail on error)
 *   npm run upload-assets -- --check-changes  # Only upload changed files (git diff)
 *   npm run upload-assets -- --force  # Upload all files regardless of changes
 */

import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import glob from 'fast-glob';
import { R2Service } from '../../src/adapters/storage/R2Service';
import { getStorageConfig } from '../../src/services/storage/StorageConfig';

interface UploadOptions {
  dryRun: boolean;
  filter?: string; // Filter by path (e.g., "Cards", "GameMode")
  verbose: boolean;
  ci: boolean; // CI mode (non-interactive, fail on error, no progress bars)
  checkChanges: boolean; // Only upload changed files (compare with git)
  force: boolean; // Upload all files regardless of changes
}

/**
 * Convert local asset path to R2 path (same logic as AssetLoader)
 */
function convertToR2Path(localPath: string): string {
  // Remove leading slash and /Resources prefix
  const path = localPath.replace(/^\/+/, '').replace(/^Resources\/?/, '');

  // Map Cards to CardGames/cards
  if (path.startsWith('Cards/')) {
    const rest = path.replace('Cards/', '');

    // Check if it's an image (in Images/ subfolder)
    if (rest.startsWith('Images/')) {
      const imageFile = rest.replace('Images/', '');
      return `games/CardGames/cards/images/${imageFile}`;
    }

    // Otherwise it's an asset file
    return `games/CardGames/cards/assets/${rest}`;
  }

  // Map GameMode/CardGames/{game}/{file} to games/CardGames/{game}/assets/{file}
  if (path.startsWith('GameMode/CardGames/')) {
    const rest = path.replace('GameMode/CardGames/', '');
    const parts = rest.split('/');
    if (parts.length >= 2) {
      const gameId = parts[0];
      const fileName = parts.slice(1).join('/');
      return `games/CardGames/${gameId}/assets/${fileName}`;
    }
  }

  // Map Pages/Games/{game}/{file} to pages/games/{game}/{file}
  if (path.startsWith('Pages/Games/')) {
    const rest = path.replace('Pages/Games/', '');
    return `pages/games/${rest}`;
  }

  // Map Pages/{page}/{file} to pages/{page}/{file}
  if (path.startsWith('Pages/')) {
    const rest = path.replace('Pages/', '');
    return `pages/${rest}`;
  }

  // Default: keep as-is (for site assets, etc.)
  return path;
}

/**
 * Parse command line arguments
 */
function parseArgs(): UploadOptions {
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    dryRun: false,
    verbose: false,
    ci: false,
    checkChanges: false,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--filter' || arg === '-f') {
      options.filter = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--ci') {
      options.ci = true;
      options.verbose = false; // CI mode is non-verbose
    } else if (arg === '--check-changes') {
      options.checkChanges = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  return options;
}

/**
 * Main upload function
 */
async function uploadAssets(): Promise<void> {
  const options = parseArgs();

  console.log('🚀 Upload Assets to R2');
  console.log('=====================\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be uploaded\n');
  }

  // Get R2 config
  const config = getStorageConfig();
  if (!config.r2Assets?.workerUrl) {
    throw new Error('R2 assets configuration not found. Set VITE_R2_WORKER_URL and VITE_R2_ASSETS_BUCKET in .env');
  }

  // Create R2Service for assets
  const r2Service = new R2Service({
    workerUrl: config.r2Assets.workerUrl,
    bucketName: config.r2Assets.bucketName,
  });

  // Find all files in packages/asset-editor/Resources/
  const resourcesDir = join(process.cwd(), 'packages', 'asset-editor', 'Resources');
  console.log(`📁 Scanning: ${resourcesDir}\n`);

  // Use fast-glob to find all files recursively
  const allFiles = await glob('**/*', {
    cwd: resourcesDir,
    onlyFiles: true,
    dot: false
  });

  // Filter files if needed
  let filesToUpload = allFiles;
  if (options.filter) {
    filesToUpload = allFiles.filter(f => f.includes(options.filter!));
    console.log(`🔍 Filter: ${options.filter} (${filesToUpload.length} files)\n`);
  }

  // Check for changes if --check-changes is enabled
  if (options.checkChanges && !options.force) {
    try {
      const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' })
        .split('\n')
        .filter(line => line.trim().startsWith('packages/asset-editor/Resources/'))
        .map(line => line.replace('packages/asset-editor/Resources/', ''));

      if (changedFiles.length > 0) {
        filesToUpload = filesToUpload.filter(f => changedFiles.includes(f));
        console.log(`🔍 Changed files detected: ${changedFiles.length} files\n`);
      } else {
        console.log('✅ No changed files detected. Skipping upload.\n');
        return;
      }
    } catch (error) {
      console.warn('⚠️  Failed to check git changes, uploading all files:', error);
    }
  }

  console.log(`📦 Found ${filesToUpload.length} files to upload\n`);

  if (filesToUpload.length === 0) {
    console.log('✅ No files to upload');
    return;
  }

  // Upload each file
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < filesToUpload.length; i++) {
    const localPath = filesToUpload[i];
    const fullLocalPath = join(resourcesDir, localPath);
    const r2Path = convertToR2Path(localPath);

    try {
      // Read file
      const fileStats = await stat(fullLocalPath);
      const fileContent = await readFile(fullLocalPath);

      if (options.verbose || options.dryRun) {
        console.log(`[${i + 1}/${filesToUpload.length}] ${localPath}`);
        console.log(`  → R2: ${r2Path}`);
        console.log(`  → Size: ${(fileStats.size / 1024).toFixed(2)} KB`);
      }

      if (!options.dryRun) {
        // Upload to R2
        await r2Service.uploadAsset(r2Path, fileContent.buffer);
        successCount++;

        if (options.ci) {
          // CI mode: minimal output
          if ((i + 1) % 10 === 0 || i + 1 === filesToUpload.length) {
            console.log(`Uploaded ${i + 1}/${filesToUpload.length} files...`);
          }
        } else if (!options.verbose) {
          process.stdout.write(`\r✅ Uploaded ${i + 1}/${filesToUpload.length} files...`);
        } else {
          console.log(`  ✅ Uploaded\n`);
        }
      } else {
        successCount++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would upload\n`);
        }
      }
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ file: localPath, error: errorMsg });

      console.error(`\n❌ Error uploading ${localPath}:`);
      console.error(`   ${errorMsg}\n`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📦 Total: ${filesToUpload.length}`);

  if (options.dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no files were actually uploaded');
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
    if (options.ci) {
      // In CI mode, fail on any error
      process.exit(1);
    } else {
      process.exit(1);
    }
  }

  console.log('\n🎉 All assets uploaded successfully!');
}

// Run if called directly
if (require.main === module) {
  uploadAssets().catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

export { uploadAssets, convertToR2Path };

