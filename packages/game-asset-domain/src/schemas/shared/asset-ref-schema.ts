import { schema } from '@ocentra/schema-domain/effect-builder';

// Shared schema for AssetResourceEntry references inside data blocks
export const AssetRefSchema = schema.object({
    guid: schema.string().uuid({ message: 'AssetRef guid must be a valid UUID' }).nullable().optional(),
    assetType: schema.string().optional(),
    type: schema.string().optional(),
    typeId: schema.string().refine(val => val === 'AssetResourceEntry', { message: 'Type ID must be AssetResourceEntry' }).optional(),
    assetRef: schema.boolean().optional(),
    displayName: schema.string().optional(),
    path: schema.string().optional(),
}).passthrough().refine(data => data.assetType || data.type || data.guid || data.path, {
    message: 'AssetRef must have at least one identifying property (assetType, type, guid, or path)'
});
