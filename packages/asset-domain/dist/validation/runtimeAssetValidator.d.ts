import type { ValidationResult } from '../validation/types';
export type RuntimeAssetValidator = (assetFile: unknown) => ValidationResult;
export declare function registerRuntimeAssetValidator(validator: RuntimeAssetValidator): void;
export declare function hasRuntimeAssetValidator(): boolean;
export declare function validateRuntimeAssetFile(assetFile: unknown): ValidationResult;
