import { registerRuntimeAssetValidator } from '@ocentra/asset-domain/validation/runtimeAssetValidator';
import type { ValidationResult } from '@ocentra/asset-domain/validation/types';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';

let isRegistered = false;

function toValidationResult(assetFile: unknown): ValidationResult {
  const validation = validateAssetFile(assetFile);

  if (validation.success) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  return {
    isValid: false,
    errors: validation.error.issues.map(issue => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'asset',
      message: issue.message,
      severity: 'error' as const,
    })),
    warnings: [],
  };
}

export function registerGameAssetRuntimeValidation(): void {
  if (isRegistered) {
    return;
  }

  registerRuntimeAssetValidator(toValidationResult);
  isRegistered = true;
}
