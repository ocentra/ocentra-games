import { registerRuntimeAssetValidator } from '@ocentra/asset-domain/validation/runtimeAssetValidator';
import { validateAssetFile } from '../schemas/asset/asset-file-schema.js';
let isRegistered = false;
function toValidationResult(assetFile) {
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
            severity: 'error',
        })),
        warnings: [],
    };
}
export function registerGameAssetRuntimeValidation() {
    if (isRegistered) {
        return;
    }
    registerRuntimeAssetValidator(toValidationResult);
    isRegistered = true;
}
