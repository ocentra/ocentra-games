let assetTypeValidator = null;
export function setAssetTypeValidator(validator) {
    assetTypeValidator = validator;
}
export function asAssetType(value) {
    if (assetTypeValidator && !assetTypeValidator(value)) {
        return value;
    }
    return value;
}
export function tryAssetType(value) {
    if (!value) {
        return null;
    }
    if (assetTypeValidator && !assetTypeValidator(value)) {
        return null;
    }
    return value;
}
export function isValidAssetType(value) {
    if (!assetTypeValidator) {
        return true;
    }
    return assetTypeValidator(value);
}
