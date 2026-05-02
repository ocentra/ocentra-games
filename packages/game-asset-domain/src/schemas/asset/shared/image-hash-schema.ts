import { schema } from '@ocentra/schema-domain/effect-builder';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export const ImageHashSchema = schema.string().refine(isImageHash, {
  message: 'imageHash must be a valid ImageHash',
});

