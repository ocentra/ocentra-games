import 'reflect-metadata';
import { serializable, serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import type { SoundHash } from '@/types/assetIdentifier';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

@serializableClass({
  assetType: 'SoundResourceEntry',
  displayName: 'Sound Resource Entry',
  icon: '🔊',
  category: AssetTypeCategory.Content,
})
export class SoundResourceEntry extends ResourceEntry {
  static assetType = 'SoundResourceEntry';

  @serializable({ label: 'Sound Hash' })
  hash: SoundHash = '' as SoundHash;
}

