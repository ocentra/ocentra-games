import 'reflect-metadata';
import { serializable, serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import type { ImageHash } from '@/types/assetIdentifier';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

@serializableClass({
  assetType: 'ImageResourceEntry',
  displayName: 'Image Resource Entry',
  icon: '🖼️',
  category: AssetTypeCategory.Content,
})
export class ImageResourceEntry extends ResourceEntry {
  static assetType = 'ImageResourceEntry';

  @serializable({ label: 'Image Hash' })
  hash: ImageHash = '' as ImageHash;
}

