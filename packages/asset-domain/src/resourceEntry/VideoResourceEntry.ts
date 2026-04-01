import 'reflect-metadata';
import { serializable, serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import type { VideoHash } from '@/types/assetIdentifier';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

@serializableClass({
  assetType: 'VideoResourceEntry',
  displayName: 'Video Resource Entry',
  icon: '🎬',
  category: AssetTypeCategory.Content,
})
export class VideoResourceEntry extends ResourceEntry {
  static assetType = 'VideoResourceEntry';

  @serializable({ label: 'Video Hash' })
  hash: VideoHash = '' as VideoHash;
}

