import type { ValidationResult } from '@/validation/types';

export type RuntimeAssetValidator = (assetFile: unknown) => ValidationResult;

let runtimeAssetValidator: RuntimeAssetValidator | null = null;

export function registerRuntimeAssetValidator(validator: RuntimeAssetValidator): void {
  runtimeAssetValidator = validator;
}

export function hasRuntimeAssetValidator(): boolean {
  return runtimeAssetValidator !== null;
}

export function validateRuntimeAssetFile(assetFile: unknown): ValidationResult {
  if (!runtimeAssetValidator) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  return runtimeAssetValidator(assetFile);
}
