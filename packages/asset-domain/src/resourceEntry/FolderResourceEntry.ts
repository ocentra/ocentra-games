import 'reflect-metadata';
import { serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

@serializableClass({
  assetType: 'FolderResourceEntry',
  displayName: 'Folder Resource Entry',
  icon: '📂',
  category: AssetTypeCategory.Content,
})
export class FolderResourceEntry extends ResourceEntry {
  static assetType = 'FolderResourceEntry';
}

