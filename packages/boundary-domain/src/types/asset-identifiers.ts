import { Schema } from '@ocentra/schema-domain/effect';

const NonEmptyString = Schema.String.pipe(Schema.minLength(1));
const HashString = Schema.String.pipe(
  Schema.filter((value) => /^[a-f0-9]{64}$/i.test(value) || 'Expected a 64-character hex hash'),
);
const AssetGuidString = Schema.String.pipe(
  Schema.filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) || 'Expected a UUID asset GUID'),
);

export const ImageHashSchema = HashString.pipe(Schema.brand('ImageHash'));
export type ImageHash = typeof ImageHashSchema.Type;

export const GameIdSchema = NonEmptyString.pipe(
  Schema.filter((value) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(value) || 'Expected a game id starting with a letter and containing only letters or numbers'),
  Schema.brand('GameId'),
);
export type GameId = typeof GameIdSchema.Type;

export const AssetGUIDSchema = AssetGuidString.pipe(Schema.brand('AssetGUID'));
export type AssetGUIDType = typeof AssetGUIDSchema.Type;

export const decodeImageHash = Schema.decodeUnknownSync(ImageHashSchema);
export const decodeGameId = Schema.decodeUnknownSync(GameIdSchema);
export const decodeAssetGUID = Schema.decodeUnknownSync(AssetGUIDSchema);
