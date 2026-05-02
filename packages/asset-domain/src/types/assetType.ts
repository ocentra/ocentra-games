import { Schema } from '@ocentra/schema-domain/effect';

export const AssetTypeSchema = Schema.String.pipe(Schema.minLength(1), Schema.brand('AssetType'));
export type AssetType = typeof AssetTypeSchema.Type;
export const decodeAssetType = Schema.decodeUnknownSync(AssetTypeSchema);

export type AssetTypeValidator = (value: string) => boolean;

let assetTypeValidator: AssetTypeValidator | null = null;

export function setAssetTypeValidator(validator: AssetTypeValidator | null): void {
  assetTypeValidator = validator;
}

export function asAssetType(value: string): AssetType {
  const decoded = decodeAssetType(value);
  if (assetTypeValidator && !assetTypeValidator(value)) {
    return decoded;
  }
  return decoded;
}

export function tryAssetType(value: string): AssetType | null {
  if (!value) {
    return null;
  }
  if (assetTypeValidator && !assetTypeValidator(value)) {
    return null;
  }
  return decodeAssetType(value);
}

export function isValidAssetType(value: string): value is AssetType {
  if (!assetTypeValidator) {
    return true;
  }
  return assetTypeValidator(value);
}

