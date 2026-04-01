import 'reflect-metadata';
import { serializable, serializableClass } from '@/serialization/decorators';
import { AssetTypeCategory } from '@/constants/assets';
import { ResourceEntry } from '@/resourceEntry/ResourceEntry';

@serializableClass({
  assetType: 'FileResourceEntry',
  displayName: 'File Resource Entry',
  icon: '📁',
  category: AssetTypeCategory.Content,
})
export class FileResourceEntry extends ResourceEntry {
  @serializable({ label: 'File Type' })
  fileType: string = '';
}

