import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

export interface ImageListEntry {
  id: string;
  label?: string;
  description?: string;
  alt?: string;
  imageHash: ImageHash;
  weight?: number;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ImageList',
  displayName: 'Image List',
  icon: '🖼️',
  category: AssetTypeCategory.Content,
})
export class ImageList extends ScriptableObject {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      images: [],
    };
  }

  @serializable({ label: 'Images' })
  images!: ImageListEntry[];
}



