import { z } from 'zod';

// Shared schema for AssetResourceEntry references inside data blocks
export const AssetRefSchema = z.object({
    guid: z.string().uuid({ message: 'AssetRef guid must be a valid UUID' }).nullable().optional(),
    assetType: z.string().optional(),
    type: z.string().optional(),
    typeId: z.string().refine(val => val === 'AssetResourceEntry', { message: 'Type ID must be AssetResourceEntry' }).optional(),
    assetRef: z.boolean().optional(),
    displayName: z.string().optional(),
    path: z.string().optional(),
}).passthrough().refine(data => data.assetType || data.type || data.guid || data.path, {
    message: 'AssetRef must have at least one identifying property (assetType, type, guid, or path)'
});
