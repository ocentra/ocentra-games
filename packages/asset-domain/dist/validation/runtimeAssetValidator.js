let runtimeAssetValidator = null;
export function registerRuntimeAssetValidator(validator) {
    runtimeAssetValidator = validator;
}
export function hasRuntimeAssetValidator() {
    return runtimeAssetValidator !== null;
}
export function validateRuntimeAssetFile(assetFile) {
    if (!runtimeAssetValidator) {
        return {
            isValid: true,
            errors: [],
            warnings: [],
        };
    }
    return runtimeAssetValidator(assetFile);
}
