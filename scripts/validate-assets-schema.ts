import { readFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import glob from 'glob';
import JSON5 from 'json5';
import { validateAssetFile } from '@ocentra/game-asset-domain/schemas/asset/asset-file-schema';
import { getCommercialAssetViolation } from '@ocentra/game-asset-domain/schemas/asset/commercial-asset-policy';

const globAsync = promisify(glob.glob);

interface AssetValidationError {
  file: string;
  assetType: string;
  guid?: string;
  errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
}

export async function validateAllAssetsSchema(
  pattern: string,
  failOnError: boolean
): Promise<void> {
  if (process.env.VITE_SKIP_ASSET_VALIDATION === '1' || process.env.VITE_SKIP_ASSET_VALIDATION === 'true') {
    return;
  }
  console.log('\n\x1b[36m\x1b[1m🔍 Validating assets (Effect Schema)...\x1b[0m');

  const assetFiles = await globAsync(pattern);

  if (assetFiles.length === 0) {
    console.log('\x1b[33m⚠️  No asset files found\x1b[0m');
    return;
  }

  console.log(`\x1b[90m   Found ${assetFiles.length} asset files\x1b[0m`);

  const allErrors: AssetValidationError[] = [];

  for (const file of assetFiles) {
    try {
      const relativePath = path.relative(process.cwd(), file);
      const preValidationViolation = getCommercialAssetViolation(relativePath);
      if (preValidationViolation) {
        allErrors.push({
          file,
          assetType: 'ForbiddenCommercialAsset',
          errors: [{ field: 'asset', message: preValidationViolation, severity: 'error' }],
        });
        continue;
      }

      const content = await readFile(file, 'utf-8');
      const json = JSON5.parse(content);
      const result = validateAssetFile(json);

      if (!result.success) {
        const assetType = (json?.system as { assetType?: string })?.assetType ?? 'Unknown';
        const guid = (json?.system as { guid?: string })?.guid;
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join('.') : 'asset',
          message: issue.message,
          severity: 'error' as const,
        }));
        allErrors.push({ file, assetType, guid, errors });
      } else {
        const parsed = result as Extract<typeof result, { success: true }>;
        const violation = getCommercialAssetViolation(
          relativePath,
          parsed.data.system.assetType,
          parsed.data.data,
        );
        if (violation) {
          allErrors.push({
            file,
            assetType: parsed.data.system.assetType,
            guid: parsed.data.system.guid,
            errors: [{ field: 'asset', message: violation, severity: 'error' }],
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      allErrors.push({
        file,
        assetType: 'Unknown',
        errors: [{ field: 'file', message: `Parse error: ${message}`, severity: 'error' }],
      });
    }
  }

  if (allErrors.length > 0) {
    console.error('\n\x1b[31m\x1b[1m❌ Asset Validation Failed\x1b[0m\n');

    for (const assetError of allErrors) {
      const relativePath = path.relative(process.cwd(), assetError.file);
      console.error(`\x1b[1m📄 ${relativePath}\x1b[0m`);
      console.error(`   Type: \x1b[36m${assetError.assetType}\x1b[0m${assetError.guid ? ` | GUID: \x1b[90m${assetError.guid}\x1b[0m` : ''}`);

      for (const error of assetError.errors) {
        const icon = error.severity === 'error' ? '❌' : '⚠️';
        console.error(`   ${icon} \x1b[33m${error.field}\x1b[0m: ${error.message}`);
      }
      console.error('');
    }

    console.error(`\x1b[31mFound ${allErrors.length} asset(s) with validation errors\x1b[0m\n`);

    if (failOnError) {
      const errorSummary = allErrors
        .map((err) => {
          const relativePath = path.relative(process.cwd(), err.file);
          const errorList = err.errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');
          return `${relativePath} (${err.assetType}):\n${errorList}`;
        })
        .join('\n\n');
      throw new Error(`Asset validation failed:\n\n${errorSummary}`);
    }
  } else {
    console.log('\x1b[32m✅ All assets validated successfully\x1b[0m\n');
  }
}
