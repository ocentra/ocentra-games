export type AssetType = string & { readonly __brand: 'AssetType' };

export type AssetTypeValidator = (value: string) => boolean;

let assetTypeValidator: AssetTypeValidator | null = null;

export function setAssetTypeValidator(validator: AssetTypeValidator | null): void {
  assetTypeValidator = validator;
}

export function asAssetType(value: string): AssetType {
  if (assetTypeValidator && !assetTypeValidator(value)) {
    return value as AssetType;
  }
  return value as AssetType;
}

export function tryAssetType(value: string): AssetType | null {
  if (!value) {
    return null;
  }
  if (assetTypeValidator && !assetTypeValidator(value)) {
    return null;
  }
  return value as AssetType;
}

export function isValidAssetType(value: string): value is AssetType {
  if (!assetTypeValidator) {
    return true;
  }
  return assetTypeValidator(value);
}

