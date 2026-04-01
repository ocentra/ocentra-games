import { z } from 'zod';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export const ImageHashSchema = z.string().refine(isImageHash, {
  message: 'imageHash must be a valid ImageHash',
});

