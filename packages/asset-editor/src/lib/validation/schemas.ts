import { Schema, type Infer, withParser } from '@ocentra/schema-domain/effect';
import { ValidationPattern } from '@ocentra/game-asset-domain/constants/validation-pattern';
import { CreateAssetError } from '@ocentra/asset-domain/constants/assets';

const TrimmedString = Schema.String.pipe(
  Schema.transform(Schema.String, {
    decode: (value) => value.trim(),
    encode: (value) => value,
  }),
);

const UnknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const GameNameSchema = withParser(TrimmedString.pipe(
  Schema.filter((value) => value.length > 0 || CreateAssetError.GameNameRequired),
));

export const GameIdSchema = withParser(TrimmedString.pipe(
  Schema.filter((value) => value.length > 0 || CreateAssetError.GameIdRequired),
  Schema.filter((value) => ValidationPattern.GameId.test(value) || CreateAssetError.GameIdInvalid),
));

export const AssetNameSchema = withParser(TrimmedString.pipe(
  Schema.filter((value) => value.length > 0 || CreateAssetError.AssetNameRequired),
));

export const AssetRegistryResourceEntrySchema = withParser(Schema.Struct({
  guid: Schema.optional(Schema.String),
  hash: Schema.optional(Schema.String),
  checksum: Schema.optional(Schema.String),
  path: Schema.String,
  type: Schema.optional(Schema.String),
  gameId: Schema.optional(Schema.NullOr(Schema.String)),
}));

export const AssetRegistryDataSchema = withParser(Schema.Struct({
  system: Schema.optional(Schema.Struct({ guid: Schema.optional(Schema.String) })),
  data: Schema.optional(Schema.Struct({ resources: Schema.optional(Schema.Array(AssetRegistryResourceEntrySchema)) })),
  resources: Schema.optional(Schema.Array(AssetRegistryResourceEntrySchema)),
}));

export const AssetDocumentSchema = withParser(Schema.Struct({
  system: Schema.optional(UnknownRecord),
  metadata: Schema.optional(UnknownRecord),
  data: Schema.optional(UnknownRecord),
}));

export const LayoutAssetRootSchema = withParser(Schema.Struct({
  system: Schema.optional(UnknownRecord),
  data: Schema.optional(UnknownRecord),
}));

export const AssetIndexEntrySchema = withParser(Schema.Union(
  Schema.Struct({
    resourceEntryType: Schema.Literal('AssetResourceEntry'),
    path: Schema.String,
    guid: Schema.String,
    assetType: Schema.String,
    displayName: Schema.String,
    fileSize: Schema.Number,
  }),
  Schema.Struct({
    resourceEntryType: Schema.Literal('ImageResourceEntry'),
    path: Schema.String,
    hash: Schema.String,
    fileSize: Schema.Number,
  }),
  Schema.Struct({
    resourceEntryType: Schema.Literal('FileResourceEntry'),
    path: Schema.String,
    checksum: Schema.String,
    fileSize: Schema.Number,
  }),
));

export const AssetIndexSchema = withParser(Schema.Struct({
  version: Schema.Literal(1),
  generatedAt: Schema.String,
  entries: Schema.Array(AssetIndexEntrySchema),
}));

export type AssetIndex = Infer<typeof AssetIndexSchema>;
export type AssetIndexEntry = Infer<typeof AssetIndexEntrySchema>;

export type AssetRegistryData = Infer<typeof AssetRegistryDataSchema>;
export type AssetRegistryResourceEntry = Infer<typeof AssetRegistryResourceEntrySchema>;
export type AssetDocument = Infer<typeof AssetDocumentSchema>;
